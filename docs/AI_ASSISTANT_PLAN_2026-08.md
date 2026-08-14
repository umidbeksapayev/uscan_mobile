# uscan_mobile — AI yordamchi (Gemini) integratsiya rejasi (2026-08-13)

> Do'kon egasi bilan chatlashadigan, loyihaning **o'z ma'lumotlaridan**
> foydalanadigan AI yordamchi. Oddiy chatbot emas — savdo, ombor va statistika
> savollariga **haqiqiy raqamlar** bilan javob beradi.
>
> Ushbu hujjat kod yozishdan **oldingi** arxitektura qarori. Kod bosqichma-bosqich
> shu rejaga ko'ra yoziladi.

---

## 0. Asosiy printsip

**AI hech qachon bazaga to'g'ridan-to'g'ri kirmaydi.**

AI faqat "qaysi funksiyani, qaysi argument bilan chaqirish kerak"ligini aytadi.
Chaqiruvni sizning kodingiz — **foydalanuvchining o'z JWT'si bilan, ya'ni RLS
ostida** — bajaradi. Bu bitta qoida xavfsizlik muammolarining 90 % ini yechadi.

Loyiha bu ish uchun deyarli tayyor: 30+ SQL RPC funksiyasi allaqachon mavjud va
RLS bilan himoyalangan. Ular AI uchun "tool" sifatida qayta ishlatiladi —
yangi backend qurish shart emas.

---

## 1. Tasdiqlangan qarorlar (2026-08-13)

| Savol | Qaror | Ta'siri |
|---|---|---|
| Kim foydalanadi | **Faqat do'kon egasi** (`is_shop_owner`) | Rol filtri murakkabligi yo'q; `cost_price`/foyda toollari ruxsat etilgan |
| Til | **Faqat o'zbek** | `systemInstruction` o'zbekcha, i18n shoxlanishi yo'q |
| Gemini tarifi | **Tekin tier** (MVP/beta) → **pullik** (real chiqishdan oldin) | Kod o'zgarmaydi, faqat billing yoqiladi |
| AI amallari | **Faqat o'qish (read-only)** | Yozuv 4-bosqichda, "tasdiq kartasi" bilan |
| Web ilova | **Kerak emas** | Edge Function faqat mobil uchun |
| Rozilik | **Majburiy ogohlantirish ekrani** | Birinchi ochilishda |
| Mijoz PII | **Gemini'ga yuborilmaydi** | `get_debts` toolisiz (pullik tier'gacha) |

> ⚠️ **Google AI Pro obunasi ≠ Gemini API.** Obuna (gemini.google.com,
> NotebookLM, Gemini CLI) API kaliti bermaydi. API kaliti alohida —
> `aistudio.google.com` → *Get API key*.

---

## 2. Arxitektura

### 2.1 Umumiy oqim

```
[RN ilova]
   │  supabase.functions.invoke("ai-chat", { chat_id, message, client_message_id })
   │  Authorization: Bearer <user JWT>        ← Supabase avtomatik qo'shadi
   ▼
[Supabase Edge Function: ai-chat]   (Deno, verify_jwt = true)
   1. JWT → user_id → shop_id + is_shop_owner tekshiruvi
   2. Kunlik kvota tekshiruvi (ai_usage_daily)
   3. Chat kontekstini yuklash: oxirgi N xabar + rolling summary
   4. Foydalanuvchi xabarini ai_messages ga yozish
   5. Gemini'ga: systemInstruction + tools[] + history + yangi xabar
   ▼
[Gemini API]  ← GEMINI_API_KEY faqat shu yerda, Supabase secrets'dan
   ├─ (a) matnli javob            → 8
   └─ (b) functionCall qaytardi   → 6
   ▼
6. TOOL ROUTER (Edge Function ichida):
      • tool whitelist'dami?
      • argumentlar Zod bilan validatsiya + clamp (limit ≤ 50, sana ≤ 1 yil)
      • foydalanuvchi JWT'li client bilan RPC → RLS filtrlaydi
      • natija qisqartiriladi (maks 20 qator, kerakli ustunlar)
   7. functionResponse Gemini'ga qaytariladi   (maks 3 tsikl)
   ▼
8. Yakuniy matn + tool metadata → ai_messages
   ▼
[RN ilova] javobni ko'rsatadi
```

### 2.2 Nega Supabase Edge Function (Next.js API route emas)

- Mobil ilova web deploy'iga bog'lanib qolmaydi.
- `verify_jwt` bilan autentifikatsiya bepul — qo'shimcha kod yo'q.
- O'sha JWT'ni funksiya ichida Supabase client'ga berib **RLS meros olinadi**.
- Kalit rotatsiyasi: secret yangilash + redeploy; ilova yangilanishi shart emas.

### 2.3 API kalit xavfsizligi

| Qoida | Sabab |
|---|---|
| ❌ `EXPO_PUBLIC_GEMINI_API_KEY` **hech qachon** | `EXPO_PUBLIC_*` JS bundle ichiga matn holida kiradi — APK'dan o'qiladi |
| ✅ `supabase secrets set GEMINI_API_KEY=...` | Faqat Edge Function runtime'ida ko'rinadi |
| ✅ Google Cloud'da API restriction | Faqat *Generative Language API* |
| ✅ `verify_jwt = true` | Anonim so'rov kvotani sarflay olmaydi |
| ❌ `service_role` kaliti tool yo'lida yo'q | Aks holda AI xatosi RLS'ni chetlab o'tadi |

Mobil ilova Gemini domeniga **umuman murojaat qilmaydi**.

---

## 3. Ma'lumotlar bazasi — migration `034_ai_chat.sql`

```
ai_chats
  id, shop_id, user_id, title,
  summary            -- eski xabarlarning siqilgan xulosasi
  summarized_upto    -- qaysi xabargacha siqilgan
  created_at, updated_at

ai_messages
  id, chat_id, role ('user' | 'model' | 'tool'),
  content (text),
  tool_calls (jsonb),          -- qaysi funksiya, qanday argument
  tokens_in, tokens_out, model, latency_ms,
  client_message_id (uuid),    -- idempotency (migration 019 naqshi)
  created_at

ai_usage_daily                 -- kvota va xarajat nazorati
  shop_id, day, requests, tokens_in, tokens_out
```

**RLS:** `ai_chats` / `ai_messages` — faqat `user_id = auth.uid()`.
Chat shaxsiy: boshqa xodim boshqa xodimning chatini ko'rmaydi.

**Kontekst oynasi:** Gemini'ga butun tarix emas, **oxirgi 10–15 xabar +
`summary`** yuboriladi. Tarix uzayganda eski qism Flash bilan bir martalik
xulosaga siqiladi. Bu — xarajatning eng katta ushlagichi.

**Tozalash:** 90 kundan eski xabarlar `pg_cron` bilan o'chiriladi.

**Mobil kesh:** TanStack Query + AsyncStorage persister (mavjud) — chat offline'da
o'qish uchun ochiladi, yozish uchun internet talab qilinadi (`useOnline()`).

---

## 4. Gemini'ga beriladigan kontekst

Ikki xil ma'lumot **aralashtirilmaydi**:

### A. Statik → `systemInstruction` (~300–500 token, har so'rovda)

- Do'kon nomi, valyuta (**so'm**), sana + vaqt zonasi (Asia/Tashkent), til (**uz**).
- Foydalanuvchi roli (egasi) va ruxsatlari.
- Raqam formati qoidasi: `2 450 000 so'm` (bo'sh joy ajratkich).
- Xulq qoidalari: *"Faqat funksiya natijasiga tayan. Ma'lumot bo'lmasa o'ylab
  topma — funksiyani chaqir yoki bilmasligingni ayt. Qisqa javob ber."*
- Kichik lug'at: do'kon kategoriyalari ro'yxati (10–20 nom).

### B. Dinamik → **faqat tool natijasi orqali**

Mahsulotlar bazasi yoki savdolar prompt ichiga **solinmaydi**
(5 000 mahsulot ≈ 200k token = qimmat va sekin).

**RAG / embedding hozircha kerak emas** — sizda tuzilgan SQL bor.
RAG faqat tuzilmagan matn (qo'llanma, hujjat) uchun kerak bo'ladi.

---

## 5. Tool qatlami (function calling)

Function calling — bu integratsiyaning **yadrosi**. Ansiz AI umumiy maslahat
beruvchi chatbot bo'lib qoladi.

### 5.1 Mavjud RPC → tool xaritasi

| Tool (AI ko'radigan nom) | Ostidagi RPC | Bosqich |
|---|---|---|
| `search_products` | `match_products` / trgm qidiruv | **1** |
| `get_today_sales` | `get_dashboard_stats` | **1** |
| `get_low_stock` | `get_low_stock_products` | **1** |
| `get_top_products` | `get_top_products` | **1** |
| `get_sales_stats` | `get_sales_stats` | **1** |
| `get_product_details` | `products` select (RLS) | 3 |
| `get_sales_trend` | `get_sales_trend` | 3 |
| `get_slow_products` | `get_slow_products` | 3 |
| `get_inventory_value` | `get_inventory_stats` | 3 |
| `get_cashier_report` | `get_cashier_report` | 3 |
| `get_debts` | `get_customers_with_balance` | **pullik tier'dan keyin** (mijoz PII) |

### 5.2 Har tool uchun 3 qatlamli filtr

1. **Whitelist** — ro'yxatda yo'q funksiya umuman mavjud emas (AI uni chaqira olmaydi).
2. **Argument validatsiyasi** — Zod: sana oralig'i, `limit` ≤ 50, `offset` ≤ 500.
3. **Natija shakllantirish** — faqat kerakli ustunlar, maks 20 qator,
   `{ rows, truncated, total }` metama'lumoti bilan.

**RLS — oxirgi va eng ishonchli devor:** foydalanuvchi JWT'si bilan chaqirilgan
RPC boshqa do'kon ma'lumotini fizik jihatdan qaytara olmaydi, hatto AI adashib
`shop_id` uzatsa ham.

### 5.3 Amaliy qoidalar

- **8–12 tadan ortiq tool bermang** — model adashadi va token yeydi.
- Tavsiflar aniq va misolli: *"Sana oralig'i bo'yicha savdo. `from`/`to` —
  `YYYY-MM-DD`. Foydalanuvchi 'bu hafta' desa, dushanbadan bugungacha."*
- **Parallel function calling** yoqiladi ("bugungi savdo va kam qolgan tovarlar"
  bitta tsiklda ikki chaqiruv).
- **Tsikl chegarasi: maks 3** — cheksiz sikl = pul yonishi.
- `toolConfig.functionCallingConfig.mode = AUTO`.

---

## 6. Yozuv amallari (4-bosqich, hozircha YO'Q)

Amallar 3 darajaga bo'linadi:

| Daraja | Misol | Siyosat |
|---|---|---|
| **L0 — o'qish** | qidiruv, statistika, qoldiq | AI to'g'ridan-to'g'ri bajaradi |
| **L1 — qaytariladigan yozuv** | narx, qoldiq tuzatish, mahsulot qo'shish | **Tasdiq kartasi majburiy** |
| **L2 — moliyaviy / qaytmas** | `process_sale`, qaytarish, nasiya to'lovi, smena yopish, o'chirish | **AI orqali umuman yo'q.** Faqat ekranga deep-link |

### "Propose → Confirm" naqshi (L1)

1. Gemini `update_product_price` ni chaqiradi.
2. Edge Function uni **bajarmaydi** — `{ type: "proposal", action, args, preview }` qaytaradi.
3. Ilova chatda tasdiq kartasini ko'rsatadi:
   *"Coca-Cola 1L: 12 000 → 14 000 so'm. [Tasdiqlash] [Bekor]"*
4. Foydalanuvchi bosganda **ilovaning o'zi** mavjud mutatsiyani chaqiradi —
   AI yo'lidan tashqarida, xuddi qo'lda tahrirlagandek.
5. Natija `ai_messages` + audit jurnaliga yoziladi.

Nega: model xato tushunsa ham hech nima o'zgarmaydi; yozuv mantig'i bitta joyda
qoladi va AI ikkinchi "yashirin backend"ga aylanmaydi.

---

## 7. Limit, xarajat, performance

### 7.1 Tekin vs pullik tier

| | Tekin | Pullik |
|---|---|---|
| Limit | ~10 RPM / ~250 so'rov kunlik (**bitta kalitga, hamma foydalanuvchiga birgalikda**) | Yuqori kvota |
| Ma'lumot | Google mahsulotni yaxshilash uchun ishlatishi mumkin | ❌ Ishlatilmaydi |
| Function calling | ✅ Ishlaydi | ✅ |
| Kerak bo'ladi | MVP, beta (5–10 do'kon) | **Real chiqishdan oldin** |

> Aniq raqamlar tez o'zgaradi — deploy oldidan Google docs'dan tasdiqlanadi.

### 7.2 Xarajat tarkibi (bitta savol, taxminan)

| Qism | Token |
|---|---|
| systemInstruction | 300–500 |
| tool deklaratsiyalari | 400–800 |
| tarix (10 xabar) | 500–1 500 |
| tool natijasi | 200–1 000 |
| javob | 150–500 |
| **Jami** | **~1.5k–4k kirish + ~0.5k chiqish** |

Tool tsikli bo'lsa kirish **ikki marta** hisoblanadi.
1 do'kon egasi × 50 savol/kun ≈ **oyiga $3–6** (Flash modeli, taxminiy).

### 7.3 Nazorat mexanizmlari (majburiy)

- `ai_usage_daily` bo'yicha kunlik limit (masalan 100 so'rov/do'kon).
- Xabar uzunligi cheklovi (~1 000 belgi).
- Har javobda `usageMetadata` bazaga yoziladi → real narx ma'lum bo'ladi.
- Anomaliya alerti (1 soatda 200 so'rov → bloklash).
- Cloud Console'da **budget alert** (billing yoqilgach).

### 7.4 Optimizatsiyalar (ta'sir kuchi bo'yicha)

1. **Flash default**, Pro faqat chuqur tahlil uchun (10–20× farq).
2. **Tarixni siqish** — 15 xabardan keyin rolling summary.
3. **Context caching** — `systemInstruction` + tool deklaratsiyalari o'zgarmaydi.
4. **Tool natijasini qisqartirish** — 20 qator, kerakli ustunlar.
5. **Streaming (SSE)** — sezilgan tezlik 2×, xarajat o'zgarmaydi.
6. **Tez-tez so'raladigan savol keshi** — "bugungi savdo" 60 s kesh.
7. **Tayyor chiplar AI'siz** — eng ko'p 5 stsenariy to'g'ridan-to'g'ri RPC + shablon.
8. `maxOutputTokens` ≈ 800 + promptda "qisqa javob".
9. **Bitta faol so'rov** — javob kelmasidan yangi savol yuborilmaydi.
10. **Thinking budget** — oddiy statistika savollariga minimal.

### 7.5 Ishonchlilik

- Gemini chaqiruviga `AbortController` + umumiy 25–30 s timeout.
- 429 uchun eksponensial retry + jitter (maks 2 urinish).
- `client_message_id` idempotency — qayta urinish takroriy xabar yaratmaydi.
- Xatolar `log-buffer` / Diagnostika ekraniga tushadi.

---

## 8. Frontend — AI chat UI

**Joylashuv:** `src/app/ai-chat.tsx` + `src/features/ai/`.
**Kirish nuqtalari:** "Ko'proq" tabida band **va** Bosh ekranda AI karta/FAB.
Pastki nav qat'iy 5 tugma qoidasi buzilmaydi.

Mavjud primitivlarga tayanadi: `ScreenHeader`, `Card`, `Badge`, `Skeleton`,
`PressableScale`, `theme/tokens.ts`, `theme/motion.ts`.

| Element | Talab |
|---|---|
| **Rozilik ekrani** | Birinchi ochilishda: *"Savollaringiz va do'kon statistikasi Google Gemini'ga yuboriladi. Mijozlarning shaxsiy ma'lumotlari yuborilmaydi."* + [Roziman] |
| **Bo'sh holat** | Qisqa tanishtiruv + **4–6 taklif chipi**: "Bugun qancha sotdik?", "Nima tugab qolyapti?", "Eng ko'p sotilgan 5 mahsulot", "Bu hafta savdo qanday?" |
| **Xabarlar** | `FlatList` `inverted`; user o'ngda `#2F80ED`, AI chapda `Card` |
| **Jarayon chipi** | AI tool chaqirganda "Savdo ma'lumoti olinmoqda…" — kutishni ishonchga aylantiradi |
| **Boy javoblar** | Raqamlar mini-kartada (tabular raqamlar, Sprint 11), ro'yxat elementlari bosiladigan → `product-form` ga deep-link |
| **Xabar amallari** | Uzoq bosish → nusxalash; javobga 👍/👎 (mavjud `feedback` jadvali) |
| **Holatlar** | Offline banner · kvota tugadi · xato + "Qayta urinish" · `Skeleton` yuklanish |
| **A11y** | `accessibilityRole`/`accessibilityLabel`, `useMotion()` reduce-motion gate'i, tegish maydoni ≥ 48pt |
| **Klaviatura** | `KeyboardAvoidingView` + input pastda qulflangan |

---

## 9. MVP doirasi (1-bosqich)

**Kiradi:**
- ✅ Migration `034_ai_chat.sql` (3 jadval + RLS)
- ✅ Edge Function `ai-chat`: JWT, egasi tekshiruvi, kvota, Gemini Flash, **streaming'siz** (oddiy JSON — soddaroq)
- ✅ **5 read-only tool**: `search_products`, `get_today_sales`, `get_low_stock`, `get_top_products`, `get_sales_stats`
- ✅ Chat ekrani: bitta faol chat, taklif chiplari, loading/error/offline holatlar
- ✅ Rozilik ekrani
- ✅ Kunlik kvota + `usageMetadata` logi

**Ataylab kirmaydi:**
- ❌ Yozuv amallari · ❌ Streaming · ❌ Ko'p chat / tarix ro'yxati
- ❌ Ovoz · ❌ RAG / embedding · ❌ Grafik render · ❌ Proaktiv push
- ❌ `get_debts` (mijoz PII — pullik tier'gacha)

**MVP mohiyati:** "savol → to'g'ri raqam" zanjiri ishlashini isbotlash.

---

## 10. Roadmap

| Bosqich | Nomi | Tarkibi | Kutilgan vaqt |
|---|---|---|---|
| **0** | Tayyorgarlik | AI Studio kaliti (tekin), `supabase secrets set`, API restriction, model ID tanlash, "hello world" Edge Function | 1 kun |
| **1** | **MVP chat** | Migration 034, `ai-chat`, 5 tool, chat ekrani, rozilik, kvota | 4–6 kun |
| **2 ✅** | Ishonchlilik | Streaming (SSE), tarix siqish, retry/timeout, Diagnostikaga ulash, 👍/👎 (migration 035). **Context caching qoldirildi** — pastdagi izohga qarang | 3–4 kun |
| **3 ✅** | Tool kengaytmasi | +4 tool (9 ta), bosiladigan mahsulot kartalari, `product-form` ga deep-link. `get_cashier_report` va `get_debts` — pullik tier'ga qoldirildi (PII) | 3–4 kun |
| **4** | Yozuv amallari | propose→confirm, L1 amallar, audit jurnali, Sozlamada "AI yozuv" tugmasi | 4–5 kun |
| **5** | Proaktivlik | Kunlik xulosa push (migration 032 + `get_owner_summaries`), anomaliya alerti, buyurtma maslahati, ovozli kiritish | 5–7 kun |
| **6** | Kengaytma | Telegram AI-bot (mavjud `telegram` feature), rasm orqali kiritish, PDF hisobot (`expo-print`), ko'p do'kon tahlili | — |

Har bosqichdan keyin: `npm run lint` **0 xato** · `docs/QURILMADA_SINOV.md` ga
sinov bandlari · `graphify update .`.

---

## 11. Kelajakdagi advanced funksiyalar

- **Proaktiv AI**: ertalabki xulosa — *"Kecha 3.2 mln, o'tgan haftadan 12 % yuqori. 4 ta tovar tugash arafasida."*
- **Anomaliya aniqlash**: g'ayrioddiy chegirma, ko'p qaytarish, kassa kamomadi (`030_shift_close` bilan).
- **Buyurtma maslahatchisi**: sotuv tezligi + qoldiq → *"Coca-Cola 5 kunga yetadi, 200 dona buyurtma qiling"* + `suppliers` bog'lash.
- **Narx maslahatchisi**: marja tahlili, sekin tovarga chegirma taklifi.
- **Ovozli rejim**: mikrofon → matn → AI → ovozli javob (qo'li band sotuvchi uchun).
- **Multimodal**: chek yoki tovar rasmini yuborib omborga qo'shish (kamera mavjud).
- **Hisobot generatori**: "O'tgan oy hisobotini PDF qil" (`expo-print`).
- **Few-shot sifat oshirish**: yaxshi baholangan savol-javoblarni promptga misol
  qilib qo'shish — fine-tuning'siz.

---

## 12. Ochiq masalalar

| Masala | Holat |
|---|---|
| **Context caching** | ❌ Qo'llanmadi. Gemini'ning ANIQ (explicit) keshi minimal token chegarasiga ega, bizning o'zgarmas blok (`systemInstruction` + 5 tool sxemasi) ~900 token — chegaradan past, ya'ni kesh yaratib bo'lmaydi. Yashirin (implicit) kesh Google tomonidan avtomatik qo'llanadi. Tool soni 10 taga yetganda qayta ko'riladi. |
| **Gemini 3.x `thoughtSignature`** | Tool tarixi qaytarilganda `functionCall` bo'laklari **xom holida** saqlanishi shart (`chat-run.ts`). Bo'laklarni `{name, args}` ga ajratib qayta qurish 400 xatosiga olib keladi. |
| **Xalqaro karta** (Google Cloud billing) | ❌ Hozircha yo'q. Real chiqishdan oldin hal qilinishi shart. Variantlar: O'zbek banklarining virtual USD Visa kartasi · Payoneer · yuridik shaxs kartasi. Uchinchi tomon API resellerlari **tavsiya qilinmaydi** (ma'lumot yana bir noma'lum tomondan o'tadi). |
| Gemini model ID | Deploy oldidan tasdiqlanadi; ENV'da saqlanadi, kodga qotirilmaydi |
| Tekin tier limitlari | Aniq RPM/RPD raqamlari docs'dan tasdiqlanadi |
| Pullik tier'ga o'tish | Kod o'zgarmaydi — faqat Cloud Console'da billing yoqiladi |

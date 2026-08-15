# uscan_mobile — Claude uchun loyiha hujjati

uscan POS tizimining **native mobil ilovasi** (React Native + Expo). Web ilova
(`../ShopScan_1v`, Next.js) bilan **bir xil Supabase backend**ni ishlatadi —
backend qayta qurilmaydi, faqat yangi client.

## Stack

| Qatlam | Texnologiya |
|--------|-------------|
| Framework | Expo (SDK 54) + Expo Router (file-based) |
| Til | TypeScript |
| Styling | NativeWind (Tailwind) — `tailwind.config.js` brend tokenlari |
| State | Zustand + TanStack Query |
| Backend | `@supabase/supabase-js` (web bilan bir xil loyiha) |
| Barcode | expo-camera (F3) — ML Kit |
| Offline | expo-sqlite + react-native-mmkv + NetInfo — F9 ✅ |
| Build | EAS Build (bulut) |

## Struktura

```
src/
├── app/                 # Expo Router yo'llari
│   ├── _layout.tsx      # root: QueryClient + SafeArea providerlar
│   └── (tabs)/          # 5-tab: index(Bosh) · sotuv · katalog · tarix · koproq
├── components/          # umumiy UI
├── lib/                 # supabase.ts · format.ts · query-client.ts
└── theme/colors.ts      # brend ranglar (JS qiymatlar)
```

## Muhim qoidalar

- **Pul DB'da `DECIMAL` so'm** (tiyin EMAS), vazn `DECIMAL` kg.
  `formatCurrency(som)` / `formatWeight(kg)` — web `utils.ts` ga mos.
  Savat summasi (F3/F4) client'da tiyinda yaxlitlanadi (float drift uchun).
- **`cost_price` (tan narxi)** kassir ekranida HECH QACHON ko'rsatilmaydi.
- **RLS** avtomatik `shop_id` bo'yicha filtrlaydi + faol-do'kon almashtirish.
- Offline sotuvda **`client_id` idempotency** (DB migration 019) qayta ishlatiladi.
- Valyuta: **so'm** · raqam formati: **bo'sh joy** (`2 450 000`).
- Brend: `#2F80ED` (urg'u) · `#0F3D6E` (asosiy) · `#7DB4F5` (ochiq).
- Pastki nav **qat'iy 5 tugma**: Bosh · Sotuv · Katalog · Tarix · Ko'proq
  (Nasiya/Hisobot/Sozlama "Ko'proq" ichida).

## Ishga tushirish

```bash
cp .env.example .env   # Supabase URL + anon key (web bilan bir xil)
npm start              # Expo dev server (Expo Go yoki dev build)
```

> F3 (kamera) va F10 (print) uchun **custom dev build** (`expo-dev-client`) kerak —
> Expo Go yetmaydi. EAS bulutda quradi.

## Roadmap

**F0–F11 barchasi bajarilgan ✅** (F10: expo-print + Bluetooth ESC-POS + QR
ekvayring; F11: eas.json AAB/IPA + expo-updates OTA; Play+App Store qo'lda yuklash).

F11'dan keyin audit sprintlari (`docs/AUDIT_AND_ROADMAP_2026-07.md`):
**Sprint 1–8 ✅** — xavfsizlik, switcher/reprint/parol, tezkor sotuv, CSV
import/eksport, bildirishnomalar, kassa yopish + xarajatlar (migration 030/031),
i18n 3 til + BottomSheet + tungi rejim, hamda **Sprint 8**: feedback forma,
xatolik jurnali (Diagnostika), soya tokenlari, umumiy ro'yxat komponentlari,
`React.memo`, a11y yorliqlari, i18n parity testi va **remote push**
(migration 032 + web `lib/push/`). **Sprint 9–10 ✅** — push'ni FCM bilan
tasdiqlash, `SheetPressable` uslub yo'qolishi, savat kartasi, bildirishnomalar
markazi. **Sprint 11 ✅** — ESLint (flat config) birinchi marta sozlandi,
tabular raqamlar, harakatni kamaytirish (a11y).
Batafsil: `docs/SPRINT_PLAN_2026-07.md`.

Sinov ro'yxati: `docs/QURILMADA_SINOV.md`.

**Lint:** `npm run lint` — 0 xato bo'lishi shart. 18 ta
`react-hooks/set-state-in-effect` ogohlantirishi ataylab qoldirilgan
(sabab sprint hujjatida). `className` bilan `style={({pressed}) => …}` ni
birga ishlatish lint bilan taqiqlangan.

**Sprint 12** — dizayn tizimi: o'lcham tokenlari (`theme/tokens.ts`),
primitivlar (`ui/screen · card · badge · icon-chip · skeleton ·
pressable-scale`), harakat tili (`theme/motion.ts`).
**Sprint 13 ✅** — kassir hisoboti (`/cashier-report`, migration 033).

**Qoidalar:** o'lchamlar `theme/tokens.ts` dan (xom raqam lint bilan
taqiqlangan) · animatsiya `theme/motion.ts` dan (`useMotion()` ichida
reduced-motion gate'i bor) · `PressableScale` faqat `style` qabul qiladi.

**AI yordamchi — 0–5-bosqich ✅** (`docs/AI_ASSISTANT_PLAN_2026-08.md`):
Supabase Edge Function `ai-chat` (Deno) + Gemini function calling, migration
`034_ai_chat.sql` / `035_ai_message_rating.sql`, `features/ai` + `/ai-chat`
ekrani, Bosh ekran header'ida "✨ AI" tugmasi. Faqat do'kon egasi, faqat
o'qish. **9 tool** mavjud RPC'lar ustida: `search_products ·
get_product_details · get_today_sales · get_sales_stats · get_sales_trend ·
get_top_products · get_slow_products · get_low_stock ·
get_inventory_summary`. Javob SSE oqimi bilan keladi (klientda `expo/fetch` —
RN'ning oddiy `fetch`'ida `response.body` yo'q), uzun suhbat xulosaga
siqiladi, javobga 👍/👎 qo'yiladi, tool topgan mahsulotlar chat ostida
bosiladigan karta bo'lib `product-form` ga olib boradi.

**AI yozuv amallari (4-bosqich):** `propose_price_change` /
`propose_stock_change` — AI faqat TAKLIF yozadi (`ai_actions`, migration 036),
o'zgarishni foydalanuvchi tasdiqlagach **ilova** bajaradi (`updateProduct`).
Edge Function'da bitta ham `update` yo'q. Ruxsat Sozlamalarda (default
yoqilgan; haqiqiy himoya — tasdiq kartasi). Ommaviy amal qo'shilsa alohida
ruxsat qaytadan kerak bo'ladi.

**Proaktiv AI (5-bosqich ✅ qurilmada tasdiqlandi 2026-08-14):** Bosh ekranda kunlik xulosa (`ai_insights`,
migration 037) — tool chaqiruvisiz, server 5 ta manbani o'zi olib bitta
Gemini so'rovi yuboradi; kesh server (kunlik) + klient (soatlik), keshdan
qaytganda kvota sarflanmaydi. `get_reorder_suggestions` (migration 038) —
sotuv tezligiga qarab "necha kunga yetadi" (kam-qoldiq ro'yxati buni
bilmaydi). **10 ta tool** — chegaraning yuqori qismi: yangi tool qo'shishdan
oldin eskilaridan birini birlashtirish kerak.

**AI qoidalari:** `GEMINI_API_KEY` faqat Supabase secrets'da (`EXPO_PUBLIC_*`
HECH QACHON) · tool'lar foydalanuvchi JWT'si bilan chaqiriladi (RLS), Edge
Function'da `service_role` yo'q · `cost_price` va mijoz PII AI'ga berilmaydi
(tekin tier) · model nomi `GEMINI_MODEL` secret'ida, kodga qotirilmaydi.
Terminal sinovi: `npm run ai:test -- "savol"` · `--diag` · `--models`.
Deploy: `npx supabase functions deploy ai-chat --project-ref <ref>`.

**AI cheklovlari (tekin tier qarori):** `cost_price`, foyda, mijoz va xodim
PII AI'ga BERILMAYDI — shu sabab `get_cashier_report` va `get_debts` tool
sifatida qo'shilmagan, `get_inventory_summary`dan `cost_value`, trend/slow
tool'laridan `profit` olib tashlangan. Pullik tier'ga o'tilgach qayta
ko'riladi (rozilik matni ham yangilanishi kerak).

**AI chat tarixi:** `ai-chat-history.tsx` — eski suhbatlar ro'yxati va qayta
ochish (`ai-history-api.ts`, RLS orqali to'g'ridan-to'g'ri, yangi migration
shart emas). Bosiladigan mahsulot kartalari DB'da saqlanmagani uchun eski
suhbatda qayta chiqmaydi (ataylab chegara) — hali tasdiqlanmagan takliflar
(`ai_actions.status='proposed'`) esa sintetik xabar sifatida tiklanadi.

**Anomaliya alerti:** qoidaga asoslangan (Gemini EMAS) — `get_shop_anomalies`
RPC (migration 039): zararli sotuv (tan narxdan past), qaytarish sakrashi,
kassa kamomadi. Bildirishnomalar markazi (`alerts-math.ts`) ga qo'shildi,
faqat egasi (`isOwner`) uchun.

Barcha sprintlar (Sprint 10 regressiyasi, 11, 12, 13) va AI 0–5-bosqich
qurilmada sinovdan o'tdi 2026-08-14 (`docs/QURILMADA_SINOV.md`, hammasi ✅).

## Auth · Onboarding · Obuna (4d-1 asosan tasdiqlandi, 4d-2/4d-3 sinov kutilmoqda)

**Autentifikatsiya (4d-1) — 2026-08-15 qurilmada asosan tasdiqlandi**,
parolni tiklash bundan mustasno (Supabase bepul email rate-limitiga
uchradi, keyinroq qaytiladi). Sinov paytida yana 2 ta jiddiy xato
tuzatildi: (1) email/parol havolasi ochilganda `getSession()`/`setSession()`
bir vaqtda ketib GoTrueClient RN'da abadiy osilib qolishi mumkin edi —
endi ketma-ketlashtirilgan + hamma joyda muhlat (`lib/with-timeout.ts`);
(2) hisob almashtirilganda (ilova yopilmasdan) avvalgi foydalanuvchining
raqamlari 1-2s miltillardi — `auth-gate.tsx`da ekran daraxti endi
`session.user.id` bo'yicha `key`lanib, almashinganda majburan to'liq
qayta yaratiladi. Tafsilot: `docs/QURILMADA_SINOV.md` 4d-1.

Supabase Auth saqlandi. Google — **native SDK**
(`@react-native-google-signin/google-signin` + `signInWithIdToken`), brauzer
ochilmaydi. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` bo'sh bo'lsa Google tugmasi
umuman ko'rinmaydi. **Email tasdiqlash YOQILADI** — dublikat akkaunt shu
bilan yopiladi (Supabase tasdiqlangan email bo'yicha identity'ni avtomatik
bog'laydi). Sessiya endi **SecureStore**da (`lib/secure-storage.ts`, 2 KB
chegarasi uchun bo'laklab yoziladi), AsyncStorage'da emas. Chiqishda
`queryClient.clear()` + persister + `activeShopId` tozalanadi
(`auth-context.tsx`). Barcha auth ekranlari `AuthShell` qobig'ida.

**Onboarding.** Do'kon nomi ENDI ro'yxatdan o'tishda emas — onboarding'da
(`(onboarding)/welcome · shop · done · waiting`). `handle_new_user()`
**shartli** qilindi (migration 040): `shop_name` metadata kelgandagina do'kon
yaratadi → **web register bir qator ham o'zgarmadi**, mobil esa
`complete_onboarding()` RPC bilan atomar yaratadi. `AuthGate` endi 3 holatli
(`(auth)` / `(onboarding)` / `(tabs)`), a'zoliklar so'rovi hal bo'lguncha
splash ushlab turiladi. Kassir yo'li do'kon YARATMAYDI (kutish ekrani) —
ilgari har bir kassirga keraksiz do'kon tegardi.

**Kassir taklifi (`shop_invites`, migration 044 — kod tayyor, qurilmada
sinov kutilmoqda).** `add_shop_member` DARHOL biriktirar edi, lekin FAQAT
email `auth.users`da allaqachon bor bo'lsa — ega va kassir aniq tartibda
harakat qilishi kerak edi. Endi `staff.tsx`dagi email maydoni haqiqiy TAKLIF
yozadi (`invite_shop_member`): kassir hali ro'yxatdan o'tmagan bo'lsa ham
ishlaydi, tartib muhim emas. Kassir tomonida `waiting.tsx` endi ko'r
"Tekshirish" emas — `list_my_invites()` bilan o'ziga kelgan takliflarni
ko'radi va `respond_shop_invite()` bilan ANIQ qabul/rad qiladi (bir
tomonlama biriktirish emas, rozilik talab qilinadi). `add_shop_member`
o'zi DB'da o'zgarishsiz qoladi (web ilova unga tegishi mumkin) — mobil
faqat yangi RPC'larga o'tdi.

`waiting.tsx` faqat do'koni YO'Q foydalanuvchida ko'rinadi (onboarding
guruhi) — allaqachon do'koni bor foydalanuvchi (masalan boshqa do'konga
kassir sifatida taklif qilingan ega) buni hech qachon ko'rmasdi. Shuning
uchun takliflar Bosh sahifa qo'ng'iroqchasi/bildirishnomalar markaziga ham
qo'shildi (`alerts-math.ts` — yangi `invites` turi, rolga bog'liq emas) va
yangi `/my-invites` ekraniga olib boradi. `InviteCard` (`features/auth/
invite-card.tsx`) ikkala ekranda ham bir xil — faqat qobiq farq qiladi.

Asosiy oqim (taklif yaratish, dublikat, rad etish, bekor qilish,
allaqachon-a'zo xatosi, allaqachon do'koni bor foydalanuvchiga
qo'ng'iroqcha orqali yetkazish) ✅ 2026-08-15 qurilmada tasdiqlandi.
Ochiq qolgan: limit sinovi (mantiq ko'rib chiqilgan, qurilmada
tasdiqlanmagan), onboarding "kutish" ekranidagi karta aynan shu yo'l
bilan alohida sinalmagan, uch til tekshiruvi — `docs/QURILMADA_SINOV.md`
4d-4. Sinov paytida topilgan 3 ta xato (SQL
ambiguous column, `get_shop_limits()`ning o'z-o'ziga bog'liqligi,
`register.tsx`da yetishmagan `emailRedirectTo`) tuzatildi — tafsilot shu
faylda. Shu bilan birga `lib/query-client.ts`ga markazlashtirilgan xato
jurnali qo'shildi (`QueryCache`/`MutationCache` `onError` → `logError`) —
ilgari so'rov/mutation xatolari Diagnostika'ga tushmasdi, endi tushadi.

**Obuna.** DO'KON darajasida (`subscriptions.shop_id UNIQUE`), user emas —
limitlar ham, RLS ham `shop_id` bo'yicha. Migration 041: `plans` (narx/limit
DB'da, o'zgartirish uchun reliz shart emas) · `subscriptions` ·
`subscription_events`. Har yangi do'konga **14 kunlik Pro sinov** (trigger
`shops` INSERT ustida — web va mobil yo'llari birdan qamrab olinadi).
Mavjud do'konlarga 90 kunlik Pro backfill. `get_shop_limits()` muddatni
**hisoblash paytida** tekshiradi (cron yo'q, eskirgan holat saqlanmaydi).
To'lov MVP'da **QO'LDA** — web `/admin` → `admin_set_plan()`; ilovada karta
integratsiyasi yo'q (App Store/Play siyosati riski ham shu bilan chetlab
o'tiladi), shuning uchun `payments` jadvali ham yo'q.

Tariflar: **Free** 100 mahsulot / 0 xodim / AI yo'q · **Pro** 79 000 so'm —
1000 / 3 / AI 30 kun · **Ultra** 199 000 so'm — cheksiz / cheksiz / AI 200.
Yillik −20%.

**Limitlar (migration 042, 044).** Majburlash **DB'da**: `products` BEFORE
INSERT trigger + `add_shop_member` + `ai_consume_quota` + `respond_shop_invite`
(xodim limiti — taklif QABUL qilinganda tekshiriladi, chunki `invite_shop_member`
hali a'zolik yaratmaydi; haqiqiy resurs sarflanganda majburlash naqshi). Bitta
nuqta REST insert, `import_products` RPC va offline sync — hammasini yopadi.
`ai_consume_quota`ning `p_limit` parametri endi **e'tiborga olinmaydi**
(imzo orqaga moslik uchun qoldi) — limit tarifdan olinadi, ilgari mijoz katta
qiymat uzatib chetlab o'tishi mumkin edi.

**Obuna qoidalari:** muddati tugaganda **hech narsa o'chirilmaydi va
read-only bo'lmaydi** — faqat YANGI mahsulot/xodim qo'shish to'siladi.
**Sotuv, chek, nasiya, qaytarish, offline — HECH QACHON to'silmaydi**
(kassani to'xtatish = mijozni yo'qotish). Limit faqat *o'sish* amallariga.
DB `plan_limit_<kalit>:<limit>` shaklida `RAISE` qiladi, mijoz
`parse-plan-error.ts` bilan ajratib `UpgradeSheet` ochadi.

Ochiq: Fiskal/OFD (Payme sandbox kutilmoqda) · pullik tier uchun xalqaro
karta · AI: ovozli kiritish, ertalabki push (web `lib/push/` ga tegish
kerak) · obuna 6-bosqich: Payme/Click self-servis to'lov, promo-kodlar.

## AI Agent (Antigravity) Rules & Skills

Ushbu loyihada AI yordamchisi (Antigravity) quyidagi "skill" va qoidalarga qat'iy amal qiladi:

1. **Mobile UI/UX:** Material Design 3, iOS HIG, Safe Area, bir qo'l bilan foydalanish qulayligi, touch-friendly elementlar, accessibility, hamda Loading/Empty/Error statelar. Premium dizayn va zamonaviy animatsiyalar ishlatiladi.
2. **Software Architecture:** Clean Architecture, Feature-Based Structure, DRY, kodni reusable va maintainable qilish.
3. **Refactoring Master:** Mavjud kodni buzmasdan yaxshilash, ortiqcha re-renderlardan qochish, performance optimizatsiyasi.
4. **Systematic Debugging:** Xatolarni taxmin bilan emas, root cause asosida tahlil qilish.
5. **Secrets Management:** API kalitlari va maxfiy ma'lumotlar hech qachon kod ichida saqlanmaydi. Supabase RLS qoidalariga to'liq amal qilinadi.
6. **Stack & Best Practices:** React Native, Expo, TypeScript best practice'lariga to'liq rioya etiladi. Barcha kod production darajasida bo'lishi shart.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

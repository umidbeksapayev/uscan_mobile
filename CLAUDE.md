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

**AI yordamchi — 0–4-bosqich ✅** (`docs/AI_ASSISTANT_PLAN_2026-08.md`):
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

Ochiq: Fiskal/OFD (Payme sandbox kutilmoqda) · Sprint 12–13 qurilmada
tekshirilmagan (`docs/QURILMADA_SINOV.md`) · pullik tier uchun xalqaro karta ·
AI 5-bosqichi (proaktiv xulosa, anomaliya alerti, buyurtma maslahati, ovoz).

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

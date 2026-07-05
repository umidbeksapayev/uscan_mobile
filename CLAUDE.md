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
**Sprint 1–5 ✅** (xavfsizlik, switcher/reprint/parol, tezkor sotuv, CSV import,
bildirishnomalar). **Joriy reja:** `docs/SPRINT_PLAN_2026-07.md` —
Sprint 6 (kassa yopish/Z-hisobot + xarajatlar, migration 030/031) ·
Sprint 7 (i18n kirill/rus, BottomSheet, a11y, katalog export) · Sprint 8 backlog.

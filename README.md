# uscan mobile

Kichik va o'rta do'konlar uchun **mobil savdo nuqtasi (POS)** — React Native + Expo.
Telefon kamerasi skanerga aylanadi, internet uzilsa ham savdo davom etadi.

**Savdo · Qoldiq · Nasiya · Kirim · Xarajat · Foyda · Hisobot** — bitta ilovada.

> `ShopScan_1v` (Next.js) veb ilovasi bilan **bir xil Supabase backend**dan
> foydalanadi. Backend qayta qurilmaydi — bu yangi client.

📖 **To'liq ma'lumot:** [`docs/UMUMIY_MALUMOT.md`](docs/UMUMIY_MALUMOT.md)

---

## Tez boshlash

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` ichida:

| O'zgaruvchi | Vazifasi |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase loyiha manzili (web bilan bir xil) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key — public, RLS himoyalaydi |
| `EXPO_PUBLIC_WEB_URL` | Web deploy manzili. Bo'sh bo'lsa QR ekvayring o'chadi |

```bash
npm start
```

> ⚠️ **Expo Go yetmaydi.** Kamera (skaner) va Bluetooth chek chop etish native
> modul talab qiladi — **custom dev build** (`expo-dev-client`) kerak.
> Build EAS bulutida qilinadi.

---

## Skriptlar

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` | To'g'ridan-to'g'ri platformada ochish |
| `npm test` | Jest — 33 fayl / 213 test |
| `npm run test:watch` | Test watch rejimi |
| `npm run lint` | `expo lint` |
| `npx tsc --noEmit` | Tip tekshiruvi |

Commit'dan oldin **`tsc` va `jest` yashil** bo'lishi shart.

---

## Struktura

```
src/
├── app/            Expo Router yo'llari — (auth) · (tabs) · qolgan ekranlar
├── components/     Umumiy UI (tab-bar, bottom-sheet, button, field, ...)
├── features/       Biznes modullar — har birida api + hook + math + UI
│                   auth · sell · products · catalog · customers · suppliers
│                   supply · history · shift · expenses · dashboard · stats
│                   print · labels · notifications · telegram · offline
├── lib/            supabase · format · offline/ · uuid · toast
├── i18n/           Tarjimalar: uz-Latn · uz-Cyrl · ru
├── theme/          colors.ts (palitra) · theme-store.ts (tungi rejim)
└── types/          database.ts
```

**Nomlash:** `use-*.ts` (hook) · `*-api.ts` (server) · `*-math.ts` (sof
funksiya, test qilinadi) · `*-sheet.tsx` (pastdan chiqadigan oyna).

Sof matematika API'dan ajratilgan — pul, vazn, qarz va farq hisoblari
qurilmasiz test qilinadi.

---

## Muhim qoidalar

- **Pul DB'da `DECIMAL` so'm** (tiyin EMAS), vazn — `DECIMAL` kg.
  `formatCurrency(som)` / `formatWeight(kg)`. Savat summasi client'da tiyinda
  yaxlitlanadi (float drift uchun).
- **`cost_price` (tan narxi) kassir ekranida HECH QACHON ko'rsatilmaydi** —
  UI'da yashirish yetarli emas, so'rovlar ham bu ustunni tanlamaydi.
- **RLS** avtomatik `shop_id` bo'yicha filtrlaydi + faol-do'kon almashtirish.
- Offline sotuvda **`client_id` idempotency** (migration 019).
- Raqam formati: **bo'sh joy** (`2 450 000`), valyuta — **so'm**.
- Brend: `#2F80ED` (urg'u) · `#0F3D6E` (asosiy) · `#7DB4F5` (ochiq).
- Pastki navigatsiya — **qat'iy 5 tugma**: Bosh · Sotuv · Katalog · Tarix · Ko'proq.

---

## Hujjatlar

| Fayl | Mazmun |
|---|---|
| [`docs/UMUMIY_MALUMOT.md`](docs/UMUMIY_MALUMOT.md) | **To'liq ma'lumot** — maqsad, foydalar, imkoniyatlar, ekranlar, arxitektura |
| [`docs/AUDIT_AND_ROADMAP_2026-07.md`](docs/AUDIT_AND_ROADMAP_2026-07.md) | Muhandislik auditi va gap-analiz |
| [`docs/SPRINT_PLAN_2026-07.md`](docs/SPRINT_PLAN_2026-07.md) | Sprint rejasi va holati |
| [`CLAUDE.md`](CLAUDE.md) | AI yordamchisi uchun loyiha qoidalari |

---

## Ish tartibi

```
branch → kichik Conventional Commits (o'zbekcha) → tsc + jest yashil → PR → merge
```

Backend migratsiyalar web repo'da (`ShopScan_1v/supabase/`) raqam tartibida
**qo'lda** ishga tushiriladi.

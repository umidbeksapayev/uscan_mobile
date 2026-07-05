# uscan_mobile — Keyingi sprintlar rejasi (2026-07-03)

> `AUDIT_AND_ROADMAP_2026-07.md`dagi 7-sprintlik rejaning davomi. Sprint 1–5
> **bajarildi** (quyida PR raqamlari bilan tasdiqlangan). Ushbu hujjat qolgan
> ishlarni kod bo'yicha qayta tekshirib, Sprint 6–8 uchun aniq reja beradi.

---

## 1. Bajarilgan sprintlar (holat: 2026-07-03)

| Sprint | Reja | Natija (PR) |
|---|---|---|
| 1 — Xavfsizlik + texnik qarz | S1–S3 cost_price oqishi, A1, A4 | #15 (S3 + server-side kam-qoldiq), #17 (S1/S2). A1: `sale-queue.ts` faqat tip/konstantaga qisqartirildi. A4: `lib→features` import olib tashlandi ✅ |
| 2 — Parity gap'lar 1 | Switcher, reprint, parol tiklash | #18 (reprint), #19 (multi-shop switcher), #20 (forgot password) ✅ |
| 3 — POS tezlashtirish | P2 tezkor sotuv, P9 tezkor narx | #22 (+#16 narx yorlig'i, #21 uuid fix) ✅ |
| 4 — Import | P7 CSV import | #23 (ommaviy CSV import) ✅ |
| 5 — Bildirishnomalar | P1, P8, P10 | #24 (Telegram xulosa + **lokal** eslatma + kassir hisoboti) ✅ |
| Audit refactorlar | — | #10 (uuid CSPRNG), #11 (fayl bo'lish), #12 (tarix pagination), #13 (toast), #14 (Maestro E2E) ✅ |

**Test holati:** 191 test case / 30 fayl (jest) + Maestro E2E kritik yo'llar.

## 2. Qolgan ishlar (kod bo'yicha tasdiqlangan, 2026-07-03)

| Element | Holat kodda | Sprint |
|---|---|---|
| P3 — Z-hisobot / kassa-smena yopish | ❌ yo'q (`shift`/`smena` hech qayerda) | **6** |
| P5 — Xarajat kundaligi | ❌ yo'q (`expense` hech qayerda) | **6** |
| P4 — Ko'p til (kirill/rus) | ❌ yo'q (i18next o'rnatilmagan) | **7** |
| A2 — Umumiy `BottomSheet` | ❌ yo'q (7+ faylda Modal boilerplate) | **7** |
| A8 — accessibilityLabel | ❌ butun kodda 1 ta | **7** |
| Katalog CSV **export** | ❌ yo'q (import bor — #23; stats CSV bor) | **7** |
| A9 — Dark mode | ❌ yo'q (`useColorScheme` ishlatilmagan) | 7 (ixtiyoriy) |
| P1 — **Haqiqiy push** (EAS remote) | 🟡 hozir faqat lokal eslatma (`expo-notifications` local) | 8 |
| Feedback forma | ❌ yo'q — backend tayyor (web migration `028_feedback.sql`) | 8 |
| A5/A6/A7/A10 (silent catch, ListItemCard, shadows, memo) | ❌ ochiq | 8 |

## 3. Sprint 6 — Kassa/smena nazorati (~5–6 kun)

> **Holat:** P3 (Z-hisobot) `feat/shift-close` PR'da bajarildi — migration
> `030_shift_close.sql` (web repo, qo'lda ishga tushirilishi kerak) +
> `features/shift` + "Kassani yopish" ekrani. Qo'shimcha: `sales.payment_method`
> ustuni kiritildi (naqd/karta/QR/nasiya endi DB'da ajratiladi). P5 (xarajatlar)
> — keyingi PR.

**Goal:** Kun oxirida kassani yopish (Z-hisobot) — kutilgan naqd vs sanalgan
naqd, farqni qayd etish. Vaqt yetsa — xarajat kundaligi.

**Backend (ShopScan_1v bilan umumiy DB — muvofiqlashtirish SHART):**
- Oxirgi migratsiya: `029_qr_payments.sql`. Yangi: **`030_shift_close.sql`** —
  `cash_closures` jadvali (`shop_id`, `business_date`, `expected_cash`,
  `counted_cash`, `difference`, `note`, `created_by`, `created_at`) + RLS
  (shop_id bo'yicha; yozish — `owner` yoki maxsus ruxsat) + kutilgan naqdni
  hisoblovchi RPC (`get_expected_cash`): naqd sotuvlar − naqd qaytarishlar
  (+ nasiya bo'yicha naqd to'lovlar) oxirgi yopilishdan beri.
- P5 uchun (vaqt yetsa): **`031_expenses.sql`** — `expenses` jadvali
  (`shop_id`, `amount`, `category`, `note`, `spent_at`, `created_by`) + RLS.

**Mobile ishlari:**
1. `features/shift/` — `shift-api.ts`, `use-shift.ts`, `shift-math.ts`
   (sof funksiya: farq/yaxlitlash — tiyin qoidasiga rioya) + unit testlar.
2. "Ko'proq" → **"Kassani yopish"** ekrani: kutilgan naqd (RPC), sanalgan
   summani kiritish, farq (+/−) rangli ko'rsatkich, izoh, tasdiqlash.
3. Yopilishlar tarixi ro'yxati (egasi uchun; kassir faqat o'z smenasini yopadi).
4. `cost_price`/foyda bu ekranda ko'rsatilmaydi (faqat naqd tushum) — RBAC qoidasi.
5. P5 (vaqt yetsa): xarajat CRUD ekrani + dashboardda "sof foyda
   (xarajatlardan keyin)" kartasi (`view_cost` ruxsatiga bog'lab).

**Branch:** `feat/shift-close` (+ `feat/expenses` alohida PR).

## 4. Sprint 7 — Polish & parity (~5–6 kun)

1. **P4 — i18n**: `i18next` + `react-i18next`; webdagi tarjima fayllarini
   (`ShopScan_1v` i18next resurslari) ko'chirish; til tanlash "Ko'proq"da,
   MMKV'da saqlash. Avval uz-kirill, keyin rus.
2. **A2 — umumiy `BottomSheet`** komponenti (`components/ui/bottom-sheet.tsx`)
   — 7 faylda takrorlangan Modal boilerplate'ni almashtirish (~150 qator kam).
3. **A8 — accessibilityLabel** — barcha ikonka-tugmalarga (skaner, FAB,
   stepper, tab-bar).
4. **Katalog CSV export** — import (#23) va stats-CSV infratuzilmasini qayta
   ishlatish; `expo-sharing` bilan ulashish.
5. **A9 — dark mode** (vaqt yetsa): NativeWind `dark:` variantlar +
   `useColorScheme`; kamida OS dark-mode'da buzilmaslik.
6. Yangi funksiyalar uchun testlar; hujjatlarni yakuniy yangilash.

**Branch:** `feat/i18n`, `refactor/bottom-sheet`, `feat/catalog-export` (alohida PR'lar).

## 5. Sprint 8 — Backlog (ixtiyoriy, prioritetlash keyin)

- **EAS remote push** — haqiqiy server-trigger push (kam qoldiq/kunlik yakun
  serverdan). Backend trigger/Edge Function talab qiladi — webteam bilan.
- **Feedback forma** — backend (`028_feedback.sql`) allaqachon bor, faqat UI.
- A5 — silent `.catch(() => {})`larga log/telemetriya.
- A6 — `ListItemCard` unifikatsiya; A7 — `theme/shadows.ts`; A10 — ro'yxat
  qatorlarida `React.memo`.
- Fiskal/OFD — Payme sandbox ochilganda.

## 6. Ish tartibi (avvalgi sprintlar uslubida)

branch → kichik Conventional Commits → `tsc` + `jest` yashil → PR (o'zbekcha
tavsif) → merge. Backend migratsiyalar web repo'da (`ShopScan_1v/supabase/`)
raqam tartibida qo'lda ishga tushiriladi.

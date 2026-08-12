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

> **Holat:** Sprint 6 BAJARILDI. P3 (Z-hisobot) — `feat/shift-close` PR:
> migration `030_shift_close.sql` + `features/shift` + "Kassani yopish" ekrani;
> qo'shimcha `sales.payment_method` ustuni kiritildi. P5 (xarajatlar) —
> `feat/expenses` PR: migration `031_expenses.sql` (owner-only RLS) +
> `features/expenses` + Xarajatlar ekrani + dashboardda "Sof foyda
> (xarajatlardan keyin)". Ikkala migration web repo'da, qo'lda ishga tushiriladi.

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

## 5. Sprint 8 — BAJARILDI (2026-08-04)

> Boshlashda aniqlangan holat: `main`da **CI qizil** edi — Sprint 7
> kommitlaridan keyin `tsc --noEmit` 4 ta xato berardi. Sprint 8 shuni
> tuzatishdan boshlandi.

| # | Ish | Branch | Natija |
|---|---|---|---|
| 0 | CI'ni yashil qilish | `fix/typecheck-green` | `categoryLabel` imzosi + `noopLock` generic; `typecheck` skripti ✅ |
| 1 | Feedback forma | `feat/feedback` | `028_feedback.sql` va tarjimalar tayyor edi — faqat UI ✅ |
| 2a | A5 — xatolik jurnali | `refactor/logger` | `log-buffer.ts` + `logger.ts`, 18 jim `catch` ulandi, Diagnostika ekrani ✅ |
| 2b | A7 — soya tokenlari | `refactor/theme-shadows` | `theme/shadows.ts` — 5 preset, 12 inline blok ✅ |
| 2c | A6 — ro'yxat komponentlari | `refactor/list-item-card` | `ListItemCard`/`ListRow`/`Avatar`/`EmptyState` ✅ |
| 2d | A10 — ro'yxat renderi | `perf/list-render` | 11 `renderItem` → `useCallback`, 4 qator `memo` ✅ |
| 3 | A8 — accessibility | `feat/a11y-labels` | 34 ta ikonka-tugma; label 54→88, role 0→45 ✅ |
| 4 | P4 — i18n yakuni | `feat/i18n-final` | Auth ekranlari + 12 komponent; `locale-parity` testi ✅ |
| 5 | P1 — remote push | `feat/push-remote` + web `feat/push-notifications` | migration **032**, `lib/push/`, 2 cron route ✅ |

**Test holati:** 213 → **245** test / 36 fayl. `tsc` 0 xato.

**Ataylab bajarilmaganlar (sabab bilan):**
- `getItemLayout` — `ListItemCard` balandligi o'zgaruvchan (subtitle bor/yo'q),
  noto'g'ri qiymat varaqlashni buzardi.
- ESLint — umuman o'rnatilmagan; o'rnatishga urinish `unrs-resolver` native
  binding xatosiga taqaldi. Alohida ish sifatida ajratildi.
- `uuid.ts` / `use-online.ts` fallback'lari jurnalga ulanmadi — juda tez-tez
  ishlaydi va 50 qatorli buferni foydali yozuvlardan tozalab yuborardi.

**Ochiq qolgan:** Fiskal/OFD — Payme sandbox ochilganda.

## 5.1 Sprint 9 — Push'ni tasdiqlash (2026-08-12)

> Sprint 8'dan keyin (2026-08-04, hujjatlashtirilmagan) 5 ta push tuzatish
> kirgan edi: kunlik xulosa vaqti Telegram gate'idan ajratildi (aks holda
> Telegramni ulamagan ega push jadvalini sozlay olmasdi — P1'ni butunlay
> bloklovchi bug edi), cron yorlig'i (21:00→00:00) va tipланган `PushResult`
> xato tasnifi. Sprint 9 shu tuzatishlarni kod darajasida tasdiqladi.

**Topilgan va tuzatilgan:**
- `registerPushToken`/`enablePush`ning 6 xato tarmog'i **hech qanday test
  bilan qoplanmagan edi**. Test yozishga urinishda **ildiz sabab** topildi:
  `loadNotifications()` ichidagi `await import("expo-notifications")` —
  Jest'ning CJS test muhitida native dinamik `import()`
  `--experimental-vm-modules`siz ishlamaydi (`babel-preset-expo` buni
  test uchun transformatsiya qilmaydi, faqat sintaksisni tan oladi —
  Metro/Hermes runtime'da ishlaydi, lekin Jest'da yo'q). Bu sabab bilan
  **shu naqshdagi barcha kod (`uuid.ts`, `use-online.ts` fallback'lari ham)
  ilgari sinovdan o'tkazib bo'lmas edi** — Sprint 8'da "juda tez-tez ishlaydi"
  deb izohlangan, aslida sabab boshqa edi.
  **Tuzatish:** `babel-plugin-dynamic-import-node` qo'shildi, faqat test
  muhitida (`api.env("test")`) yoqiladi — ilova bundle'iga (Metro) ta'sir
  qilmaydi. `babel.config.js`.
- `src/features/notifications/__tests__/notify-register.test.ts` (8 holat)
  va `notify-register-nomodule.test.ts` (native modul yo'q holati, alohida
  fayl — jest.mock bir marta baholanadi) qo'shildi. 245 → **254** test.
- Server cron jadvali (`ShopScan_1v/vercel.json`: 02:00/19:00 UTC =
  07:00/00:00 Toshkent) va mobil UI yorlig'i (`telegram-summary-card.tsx`)
  mos ekanligi tasdiqlandi — nomuvofiqlik yo'q.
- `ShopScan_1v/src/lib/push/{expo,dispatch}.ts` ko'rib chiqildi — Expo
  `DeviceNotRegistered` tokenlari to'g'ri tozalanadi, batch yuborish xato
  tashlamaydi (bitta do'kon yiqilsa qolganlari yuborilishda davom etadi).

**⚠️ Yangi topilgan, tuzatilmagan (foydalanuvchi tomonidan hal qilinishi
kerak):** `app.json`da Android uchun `googleServicesFile` sozlanmagan va
`google-services.json` repo tarixida hech qachon bo'lmagan. Expo Push (FCM V1)
Android'da bu fayl **va** EAS'ga yuklangan Firebase Service Account key talab
qiladi. Bu — `tokenFailed` xatosining eng ehtimolli sababi bo'lishi mumkin
(agar productionda kuzatilsa). Tekshirish: Firebase loyihasi bormi →
`google-services.json`ni yuklab `app.json → expo.android.googleServicesFile`ga
ulash → `eas credentials -p android` orqali FCM Service Account key
yuklash → yangi dev build.

**Hali ham qo'lda tekshirish kerak (jismoniy qurilma talab qiladi):** haqiqiy
Android/iOS qurilmada "Push yoqish" tugmasi va kunlik xulosa cron'ining
kelishi.

## 6. Ish tartibi (avvalgi sprintlar uslubida)

branch → kichik Conventional Commits → `tsc` + `jest` yashil → PR (o'zbekcha
tavsif) → merge. Backend migratsiyalar web repo'da (`ShopScan_1v/supabase/`)
raqam tartibida qo'lda ishga tushiriladi.

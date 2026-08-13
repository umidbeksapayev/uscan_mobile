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
  07:00/00:00 Toshkent) va mobil UI yorlig'i mos ekanligi tasdiqlandi.
- `ShopScan_1v/src/lib/push/{expo,dispatch}.ts` ko'rib chiqildi — Expo
  `DeviceNotRegistered` tokenlari to'g'ri tozalanadi, batch yuborish xato
  tashlamaydi (bitta do'kon yiqilsa qolganlari yuborilishda davom etadi).

**FCM sozlanmagani — topildi va HAL QILINDI ✅**

Qurilmada sinovda `push.tokenFailed` chiqdi: *"Default FirebaseApp is not
initialized in this process uz.uscan.app"*. Sabab: Android'da Expo Push
FCM V1 orqali ishlaydi, `google-services.json` esa loyihada umuman yo'q edi.

Bajarilgan qadamlar (takrorlash kerak bo'lsa — masalan yangi Firebase
loyihasida):
1. Firebase Console → Android ilova, package **`uz.uscan.app`** (aynan
   `app.json` dagi qiymat).
2. `google-services.json` → repo tub papkasiga; `app.json` →
   `expo.android.googleServicesFile: "./google-services.json"`.
   ⚠️ Fayl **git'ga qo'shilishi shart** — EAS Build bulutda ishlaydi va
   faqat git kuzatgan fayllarni ko'radi. Maxfiy emas (Google hujjatiga
   ko'ra): faqat loyiha identifikatorlari va package/imzo bilan cheklangan
   client key, ular baribir APK ichida ochiq turadi.
3. Firebase → Project Settings → Service Accounts → *Generate new private
   key*; keyin `npx eas-cli credentials -p android` → development →
   **Google Service Account → …for Push Notifications (FCM V1) → Set up**.
   Bu kalit maxfiy — EAS'da saqlanadi, git'ga TUSHMAYDI.
4. Yangi dev build (`npx eas-cli build --profile development --platform
   android`) — native config o'zgargani uchun OTA yetmaydi.

**Natija:** qurilmada "Push yoqish" ishladi, `tokenFailed` yo'qoldi.
Sprint 9 yopildi.

## 5.2 Sprint 10 — UI tuzatishlari va bildirishnomalar markazi (2026-08-13)

**Ildiz sabab topildi: `SheetPressable` uslublarini yo'qotardi.**
`components/ui/bottom-sheet.tsx` `className` bilan birga `style`ni
**funksiya** ko'rinishida berardi. NativeWind v4 `className` bo'lgan
komponentning `style` propini o'zi hisoblagan uslublar bilan almashtiradi —
funksiya umuman chaqirilmay, undagi `height`/`backgroundColor`/`borderWidth`
jimgina yo'qolardi (xato ham bermaydi).

Amalda: to'lov oynasidagi tugmalar balandliksiz (~25px) va fonsiz chiqardi;
tanlangan to'lov usuli oq matn + oq fon bo'lib **butunlay ko'rinmasdi**.
Bu **barcha 9 ta BottomSheet**ga tegishli edi. Tuzatish: `style` oddiy
massiv, bosilish holati `useState` orqali.

> ⚠️ Qoida: `className` bilan `style={({pressed}) => …}` ni HECH QACHON
> birga ishlatmang. `className`siz joylarda (masalan `settings.tsx`) funksiya
> ishlaydi — muammo faqat ikkalasi birga bo'lganda.

**Sotuv ekrani:** savat kartasi 4 qatordan 2 qatorga (~177px → ~82px), bir
ekranda 3-4 emas 7-8 mahsulot. "DONALI/VAZNLI" yorlig'i olib tashlandi
(birlik narxi qatori ayni ma'lumotni beradi). Tugmalar 44→34px, `hitSlop`
bilan bosish maydoni 50px. **Xato tuzatildi:** "+" va o'chirish tugmalarining
`hitSlop` maydonlari ustma-ust tushib, "+" ning o'ng chetini bosganda
mahsulot tasodifan o'chib ketishi mumkin edi. "Tez-tez sotiladigan" savat
bo'sh bo'lmaganda yashiriladi.

**To'lov oynasi:** QR to'lov faqat ekvayring sozlangan do'konda ko'rinadi
(aks holda u QR ko'rsatmasdan oddiy sotuvni yozardi). "Plastik" saqlanib
qoldi — u `card` deb yozilmasa, `get_expected_cash` (migration 030,
`payment_method IN ('cash','debt')`) o'sha pulni kassada kutadi va har
karta to'lovida soxta kamomad chiqadi.

**Bildirishnomalar markazi (yangi `/notifications`):** Bosh sahifa
header'ida qo'ng'iroqcha + sanoq. Ilgari ogohlantirishlar tarqoq edi,
qarzdorlar esa ilovada umuman ko'rinmasdi. Mantiq `alerts-math.ts` da
(sof funksiya + 7 test). Sanoq — muammo TURLARI soni, yig'indisi emas.
Yangi so'rov qo'shmaydi (mavjud query key'lar keshini bo'lishadi).

**Kunlik xulosa sozlamasi birlashtirildi:** 3 ta karta va IKKITA alohida
vaqt tanlagich (09:00/21:00 lokal vs 07:00/00:00 server — bir xil nom,
turli vaqt) o'rniga bitta karta: vaqt + kanallar holati.
`get_push_summaries` xulosani faqat `sh.owner_id` tokenlariga yuboradi —
ya'ni **kassir push yoqsa unga hech qachon hech narsa kelmasdi**; endi bu
karta faqat egaga ko'rsatiladi. `push-card.tsx` va
`telegram-summary-card.tsx` o'chirildi.

**Test:** 245 → 254 → **261**. `tsc` 0 xato.

**Dizayn skillari o'rnatildi:** `vercel-labs/agent-skills` dan
`web-design-guidelines` va `vercel-react-native-skills`
(`.claude/skills/`, `skills-lock.json`).

## 5.3 Sprint 11 — ESLint va dizayn auditi (2026-08-13)

### ESLint (birinchi marta sozlandi)

`package.json`da `expo lint` skripti bor edi, lekin **konfiguratsiya fayli
yo'q** — ya'ni lint hech qachon ishlamagan. Endi `eslint.config.js` (flat
config) + `eslint-config-expo`.

Yo'ldagi to'siq: `eslint-plugin-react` ESLint 10 da yiqiladi — versiyani
avtomatik aniqlashda olib tashlangan `context.getFilename()` ni chaqiradi.
Yechim: `settings.react.version` ni qo'lda ko'rsatish (aniqlash kodi umuman
ishga tushmaydi).

**Loyihaga xos qoida qo'shildi:** `className` bilan
`style={({pressed}) => …}` ni birga ishlatish **taqiqlandi**
(`no-restricted-syntax`). Bu Sprint 10 dagi `SheetPressable` ildiz sababi —
endi u qaytib kelsa lint darhol to'xtatadi. Hozircha 0 ta buzilish.

**Ataylab yumshatilgan ikki qoida:**
- `react/no-unescaped-entities` — **o'chirildi**. O'zbek lotinida `'` harf
  (o', g', ta'minotchi), qoida butun interfeys matnida shovqin qilardi.
- `react-hooks/set-state-in-effect` — **ogohlantirish** (18 joy). Barcha
  BottomSheet'lar `@gorhom/bottom-sheet` modalida va yopilganda bolalarini
  unmount QILMAYDI, shuning uchun "ochilganda formani tozalash" effekti
  yagona ishlaydigan yo'l (`key` bilan remount qilib bo'lmaydi). Kelajakda
  sheet arxitekturasi o'zgarsa qayta ko'riladi.

**Tuzatilgan haqiqiy topilmalar:**
- `sync-toast.tsx` — konflikt va sinxronlash xabarlari **hardcoded o'zbekcha**
  edi (qolgan ilova tarjima qilingan holda). `t()` ga o'tkazildi,
  `sync.conflicts` kaliti 3 tilga qo'shildi. Shu yerda `t` (tarjima) ni
  `setTimeout` natijasi soyalab turgani ham tuzatildi.
- Ishlatilmagan import, ishlamaydigan `eslint-disable` direktivasi, takroriy
  importlar, `Array<T>` → `T[]`.
- `jest-expo` va `react-test-renderer` `dependencies`dan `devDependencies`ga.

### Dizayn auditi (skillar bo'yicha)

`vercel-react-native-skills` + Web Interface Guidelines asosida.

**Tekshirilgan va toza chiqqan:** ro'yxatlarda `keyExtractor` va
`useCallback`li `renderItem` bor, qatorlar `memo`da (Sprint 8 A10);
`{count && …}` naqshi (RN da "0" ni matn sifatida chizib yiqiladi) hech
qayerda yo'q; ikonka-tugmalarda a11y yorliqlari bor.

**Topilgan va tuzatilgan:**
- **Raqamlar tabular emas edi** (`theme/typography.ts` → `tabularNums`).
  Standart shriftda `1` boshqa raqamlardan tor — savat jami har mahsulot
  qo'shilganda sakrab turardi, ro'yxatdagi narxlar tekis ustunga terilmasdi.
  POS'da raqam eng ko'p o'qiladigan element. Qo'llandi: `StatsCard` (Bosh +
  Statistika hammasi bir joydan), savat qatori va jami, kassa yopish
  (kutilgan/sanalgan/farq), nasiya balanslari, tarix, kunlik sof foyda.
- **Harakatni kamaytirish umuman hisobga olinmasdi.** Skanerdagi lazer
  chizig'i cheksiz tebranardi — vestibulyar sezgirligi bor foydalanuvchi
  uchun eng bezovta qiluvchi naqsh. `useReducedMotion()` bilan chiziq
  o'rtada qotadi, skanerlash ishlashda davom etadi.
- Tipografika: 3 tilda 32 tadan `...` → `…`.

### Yo'l-yo'lakay: eskirgan roadmap yozuvlari

Audit hujjatidagi ikki band aslida bajarilgan ekan — P9 (shtrix-kodsiz
tezkor narx: `sell/quick-price-sheet.tsx` + `misc-product.ts`) va P10 ning
asosiy qismi (kassir bo'yicha tushum — `statistika.tsx` da mavjud).
`sale.created_by` mobil kodda ishlatilmaydi, shuning uchun **kassir
kesimidagi kengaytirilgan hisobot** ochiq qolmoqda.

### Sinov

`docs/QURILMADA_SINOV.md` — qurilmada bosib chiqiladigan ro'yxat (Sprint 11
yangiliklari + hali qurilmada tasdiqlanmagan Sprint 10 tuzatishlari).
Sprint 11 o'zgarishlari JS-only — yangi dev build kerak emas.

**Natija:** lint 0 xato / 18 ogohlantirish · `tsc` 0 xato · 261 test yashil.

## 5.4 Sozlamalar ekrani qayta dizayni (2026-08-13)

Brend ko'kiga to'liq o'tkazish + tushunarlilik.

**Ranglar.** Ikonka chiplari har qatorda boshqa rangda edi (binafsha `#9333ea`,
sariq `#f59e0b`, yashil `#10b981`, `rgba(...)` qattiq qiymatlar) — bu ranglar
hech qanday MA'NO bermasdi va palitradan olinmagani uchun tungi rejimda
tekshirilmagan edi. Hammasi `primaryTint` + `primary` ga birlashtirildi;
qatorlarni ikonka shakli ajratadi. Diagnostika ataylab neytral (`neutralTint`)
— u ikkilamchi, texnik ekran. Danger tugmasi ham qattiq `rgba(220,38,38,…)`
o'rniga `dangerTint`/`dangerBorder`/`dangerInk` tokenlariga o'tdi (tungi
rejimda endi to'g'ri teskarilanadi).

**Do'kon kartasi** — oq karta o'rniga `primary → primaryDeep` gradient
(Bosh sahifadagi statistika kartalari bilan bir tilda), ustida rol nishoni
("Ega" / "Kassir" + ikonka), ya'ni "kim sifatida kirganman" savoliga darhol
javob beradi.

**Bo'lim sarlavhalari** — brend ko'kida, chapida ingichka ko'k chiziq bilan.

**Tarjima bo'shlig'i (asosiy topilma).** Ekranda **18 ta matn qattiq
o'zbekcha yozilgan** edi — "Sozlamalar", "Qo'shish", "Hali kassirlar yo'q",
"Xodimni do'kondan chiqarish", mavzu variantlari va h.k. Rus yoki kirill
tilida ochilganda ular o'zbekcha qolardi. Hammasi 3 tilga chiqarildi.
Kassir **ruxsat nomlari** ham (`PERMISSION_LABELS`) tarjimasiz edi, holbuki
`staff.perm_*` kalitlari allaqachon mavjud edi — endi ular ishlatiladi,
izohlar uchun `staff.permHint_*` qo'shildi.

**A11y va qulaylik:** har qatorga `accessibilityRole` va nom+tavsifni bitta
o'qiydigan yorliq; tanlov qatorlari `radio` roli bilan va tanlangani faqat
rang emas, **belgi** (✓) bilan ham ko'rsatiladi; bosilish holati barcha
qatorlarda ko'rinadi (ilgari orqaga tugmasi bosilganda ham o'zgarmasdi —
`({pressed}) => …` ikkala holatda bir xil rang qaytarardi); email maydoniga
`autoCorrect`/`spellCheck` o'chirildi va `textContentType` berildi; ruxsat
nishoni tabular raqamda va `/6` o'rniga ro'yxat uzunligidan hisoblanadi.

**Natija:** `tsc` 0 xato · lint 0 xato · 261 test yashil · 55 ta tarjima
kaliti 3 tilda ham tekshirildi.

## 5.5 Sprint 12 — dizayn tizimi (2026-08-13)

Sababi: Sozlamalar ekrani qayta chizilgandan keyin ham natija "o'rtacha"
baholandi. O'lchov sabab ko'rsatdi — **ranglar tizimli, o'lchamlar esa yo'q**:
14 xil `borderRadius`, 13 xil `fontSize`, bo'sh joy shkalasi umuman yo'q,
24 ta ekrandan atigi 2 tasida animatsiya. Ekranlarni birma-bir qayta
chizishdan davom etsak, natija yana "o'rtacha" bo'lardi — har ekran o'z
raqamlarini o'zi o'ylab topgani uchun ritm yo'qolgan edi.

### 1-bosqich — o'lcham tokenlari ✅

Shkala **o'ylab topilmadi**. Shrift 400 ta joyda `className` orqali, atigi
76 ta joyda inline berilgan (radius: 208 va 55) — ya'ni Tailwind shkalasi
allaqachon amaldagi kanon edi. Yangi shkala kiritilsa, 400 ta joyning
ma'nosi jimgina o'zgarardi; shuning uchun teskarisi qilindi — inline
qiymatlar shkalaga qaytarildi.

`theme/tokens.ts` (radius/text/space) + `text-2xs` (10px, nishonlar uchun —
Tailwind'da yo'q edi). Ikkalasining ajralishini test bloklaydi.

Radius ko'chirish **ma'noviy** bo'ldi: `r=22` bo'lgan 44px tugma, `r=7`
bo'lgan 14px nuqta, `r=2` bo'lgan 3px chiziqcha — bularning hammasi aslida
aylana/pill ekan, "eng yaqin qadam"ga emas `full` ga ketdi. Shu tasnifdan
keyin 4px qadam ishlatilmay qoldi va tokenlardan olib tashlandi.

125 ta almashtirish. Xom raqam qaytmasligi uchun lint qoidasi qo'shildi.

### 2-bosqich — primitivlar ✅

**`ScreenHeader`** — 15 ta ekranda takrorlangan (ikkitasida ikki martadan,
jami 17 ta nusxa). Farqlari ataylab emas edi: orqaga ikonkasi 20/24/26
(uch xil), tugma goh 40×40 bo'sh, goh 36×36 chegarali; sarlavha uch xil
uslubda; a11y yorlig'i goh `common.back`, goh `common.close` — ya'ni ekran
o'quvchi bir xil tugmani "Orqaga" va "Yopish" deb turlicha e'lon qilardi.

**`Card`** — 20+ faylda qo'lda yozilgan qobiq. Chegara qalinligi ikki xil
edi (27 joyda `1`, 11 joyda `0.5`); Android'da 0.5px qurilmaga qarab goh
ko'rinadi, goh yo'qoladi — kanonik qiymat `1`. `tone` bilan semantik
variantlar (xato/ogohlantirish banneri) ham shu yerdan.

**`Badge`** va **`IconChip`** — nishon goh `20`, goh `999` radius bilan
yozilardi; ikonka chipi esa 32/36/38/40/46/52/54 (yetti xil o'lcham) edi.
Endi `Badge` har doim `full`, chip uch qadamda (`sm`/`md`/`lg`).

Sozlamalar ekrani primitivlarga ko'chirildi (lokal `cardStyle`/`cardShadow`
yordamchilari va `CHIP`/`RADIUS` konstantalari o'chdi).

> `Screen` (SafeAreaView qobig'i) ATAYIN yozilmadi: u JSX daraxtini o'rashni
> talab qiladi, ya'ni header almashtirishdan qaltisroq. Header qurilmada
> tasdiqlangach, 4-bosqichda qo'shiladi. Ishlatilmaydigan komponentni
> oldindan yozib qo'yish — o'lik kod.

### 3-bosqich — harakat tili ✅

`theme/motion.ts` — davomiylik (150/220/320) va easing tokenlari +
`useMotion()` hook. Hook ichida `useReducedMotion` gate'i bor: sozlama
yoqilgan bo'lsa barcha davomiylik **0** bo'ladi, ya'ni animatsiya kodini
shartlab o'tirish shart emas. Sprint 11 da skanerda aynan shunday gate
qo'lda yozilgan edi — uni har yangi animatsiyada takrorlash unutish uchun
ochiq eshik edi.

**`PressableScale`** — bosilganda 0.97 ga kichrayadigan `Pressable`. Ilgari
bosilish javobi tarqoq edi: ba'zi joyda `android_ripple`, ba'zi joyda fon
rangi almashishi, ko'p joyda **umuman yo'q**. Ko'lam o'zgarishi ikkala
platformada bir xil ishlaydi, rangga bog'liq emas (tungi rejimda ham
seziladi) va `transform` GPU'da chiziladi.

Qo'llandi: barcha ekran header'larining orqaga tugmasi, `ListItemCard`
(4 ekranda ishlatiladi), sotuv ekranidagi to'lov tugmasi (ilovadagi eng ko'p
bosiladigan tugma) va uchta FAB.

> `PressableScale` faqat `style` qabul qiladi, `className` emas — NativeWind
> bilan animatsiyalangan komponentni aralashtirish Sprint 10 dagi uslub
> yo'qolishi bilan bir xil turdagi xavf. Shu sabab `ListItemCard` va header
> tugmasi `className`dan `style`ga o'tkazildi.

**`Skeleton`** — yuklanish o'rindiqlari (`nasiya`, `xarajatlar`,
`ta'minotchilar`). `ActivityIndicator` "nimadir yuklanmoqda" deydi, lekin
nima ekanini ko'rsatmaydi va yuklangach sahifa sakraydi; skeleton kelayotgan
kontent shaklini oldindan egallaydi.

**Yo'l-yo'lakay ikkita topilma:**
- React Compiler qoidasi (`react-hooks/immutability`) Reanimated shared
  value'ga `.value = …` deb yozishni bloklaydi. To'g'ri API — `.get()` /
  `.set()`. Skanerdagi mavjud kod ham shu API'ga o'tkazildi.
- `entering`/`exiting` animatsiyalari (`FadeInDown` va h.k.) uchun qo'lda
  gate KERAK EMAS: Reanimated ularga standart `ReduceMotion.System` qo'yadi.
  Hujjatlab qo'yildi, aks holda ortiqcha kod yozilardi.
- `sotuv.tsx` dagi yagona `TouchableOpacity` ham yo'q qilindi (skill
  `Pressable` ni tavsiya qiladi).

### Qolgan bosqich

- **4-bosqich — ekranlarni ko'chirish**: `Screen` qobig'i + qolgan inline
  uslublar.

**Natija:** `tsc` 0 xato · lint 0 xato · 265 test yashil.

## 5.6 Sprint 13 — Kassir hisoboti (2026-08-13)

Audit hujjatidagi oxirgi ochiq funksional bo'shliq (P10).

**Avval bir tuzatish:** audit hujjati ustunni `sale.created_by` deb yozgan,
haqiqiy nom esa **`cashier_id`**. Shu sabab "mobil kodda ishlatilmaydi"
degan xulosa ham noto'g'ri edi — u `statistika.tsx` da allaqachon
ishlatilardi (kassir kesimida sotuv soni + tushum).

**Nega server RPC (migration 033):** mavjud `cashier-api.ts` sotuv
qatorlarini client'ga tortib, **2000 tasi bilan cheklanib** yig'ardi.
Kuniga 60 ta sotuv qiladigan do'kon oyiga ~1800 ta qiladi — ya'ni real
do'kon bu chegaraga yetadi va hisobot **jimgina noto'g'ri raqam**
ko'rsatardi. Statistikadagi kichik blok uchun bunga chidasa bo'ladi,
hisobot uchun yo'q. Agregatsiya `get_cashier_report` ga ko'chirildi
(030/032 naqshi).

**Kassir o'z natijasini ko'radi.** Filtrlash server tomonida: client'da
gate qo'yish soxta xavfsizlik bo'lardi, chunki RPC'ni baribir
to'g'ridan-to'g'ri chaqirish mumkin.

**Xavfsizlik qarori:** `returns` RLS'i (014) ataylab faqat egaga ochiq.
RPC `SECURITY DEFINER` bo'lgani uchun RLS'ni chetlab o'tadi — shuning uchun
kassirga qaytarish va foyda ustunlari `null` qaytariladi. Mavjud chegara
kengaytirilmadi.

**Qaytarishlarni biriktirish:** `returns` da kassir ustuni yo'q, faqat
`sale_id`. Qaytarish **sotuvni qilgan** kassirga biriktiriladi — hisobot
uchun ma'noli savol "bu kassir sotgan tovarning qanchasi qaytdi", kim
rasmiylashtirgani emas.

**Yangi ekran** `/cashier-report`: davr tanlagich (bugun/hafta/oy), jami
kartasi, har kassir uchun tushum · o'rtacha chek · foyda (egada) · to'lov
usullari ulushi (bitta gorizontal chiziq) · qaytarish soni va ulushi.
Sprint 12 primitivlarida qurilgan (`ScreenHeader`, `Card`, `Badge`,
`SkeletonList`, `PressableScale`, tokenlar).

**Testlar (+13):** `cashier-report-math.ts` sof funksiyalari. Ular ichida
bitta nozik joy qoplangan — **o'rtacha chek qatorlar o'rtachasining
o'rtachasi EMAS**: 10×1000 va 1×100000 misolida noto'g'ri usul 50 500,
to'g'risi 10 000 beradi.

⚠️ **Migratsiya qo'lda ishga tushiriladi:** `ShopScan_1v/supabase/
migrations/033_cashier_report.sql` — Supabase SQL Editor'da. Ungacha
ekran "migration 033 ni ishga tushiring" xabarini ko'rsatadi.

**Natija:** `tsc` 0 xato · lint 0 xato · 278 test yashil.

## 6. Ish tartibi (avvalgi sprintlar uslubida)

branch → kichik Conventional Commits → `tsc` + `jest` yashil → PR (o'zbekcha
tavsif) → merge. Backend migratsiyalar web repo'da (`ShopScan_1v/supabase/`)
raqam tartibida qo'lda ishga tushiriladi.

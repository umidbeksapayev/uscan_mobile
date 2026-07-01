# uscan_mobile — Audit, Gap Analysis va Roadmap (2026-07)

> Ushbu hujjat CLAUDE.md'dagi 4-bosqichli topshiriq (audit → gap analysis →
> product taklif → roadmap) natijasi. 5-bosqich (real kod, sprint-by-sprint,
> branch+PR) ushbu hujjat tasdiqlangandan keyin, alohida sessiyalarda boshlanadi.
>
> **Metodologiya:** `uscan_mobile/src` va `ShopScan_1v/src` to'liq o'qib chiqildi
> (fayl nomlariga qarab emas). Har bir topilma uchun aniq `file:line` keltirilgan.

---

## 0. Yakuniy xulosa (TL;DR)

`uscan_mobile` kutilganidan ancha ilg'or holatda: **ROADMAP.md eskirgan** — u
F6/F7/F8'ni "rejalashtirilgan" deb ko'rsatadi, lekin kodda Dashboard, Nasiya,
Kirim/Ta'minotchi, Kategoriyalar, RBAC, Offline, Print+QR — barchasi **allaqachon
ishlab chiqilgan va ishlaydi**. Kod sifati yuqori: pul-matematikasi to'g'ri,
`cost_price` maxfiyligi deyarli hamma joyda to'g'ri amalga oshirilgan, offline-sync
puxta yozilgan, testlar (139 ta) qamrovi yaxshi.

Qolgan haqiqiy ishlar uchta guruhga bo'linadi:
1. **2 ta High-priority xavfsizlik bug'i** (cost_price oqib chiqishi) — darhol tuzatish kerak.
2. **Web'da bor, mobile'da yo'q haqiqiy funksiyalar**: do'kon almashtirish UI, parolni tiklash, push-bildirishnoma, Excel import/export, Telegram eslatmalar, ko'p tilli (kirill/rus), dark mode.
3. **Yangi mahsulot g'oyalari** (kichik do'kon egalari uchun) — pastda 3-bosqichda.

---

## 1-BOSQICH — Muhandislik auditi

### 1.1 Xavfsizlik (High priority)

| # | Muammo | Joyi | Nega muammo | Yechim |
|---|---|---|---|---|
| S1 | `getProduct()` `select("*")` orqali `cost_price`ni HAR QANDAY rolga qaytaradi | `src/lib/products.ts:100`, `src/app/product-form.tsx:78` | Boshqa barcha o'qish yo'llari (`use-products.ts`, `product-cache.ts`, `lookup.ts`, `dashboard-api.ts`) aniq ustun ro'yxati bilan `cost_price`ni chiqarib tashlaydi — faqat shu funksiya emas. `isOwner` tekshiruvi (`product-form.tsx:244`) faqat input maydonini yashiradi, fetch'ni to'xtatmaydi. Natija: kassir TanStack Query cache'ida `cost_price`ni oladi. | `getProduct`ga ham aniq ustun ro'yxati bering; `cost_price`ni faqat `isOwner` bo'lsa alohida so'rov bilan oling. |
| S2 | Katalogdagi qatorni bosish `canManageProducts`/`isOwner` tekshiruvisiz `product-form`ga o'tkazadi (S1'ni ishga tushiradi) | `src/app/(tabs)/katalog.tsx:321` | Kassir istalgan mahsulotni "tahrirlash" ekraniga ochib, tan narxini ko'rishi mumkin. | Navigatsiyadan oldin ruxsat tekshiruvi qo'shing; ruxsat yo'q bo'lsa faqat ko'rish (read-only) rejimini oching. |
| S3 | `history-api.ts` sotuvlar tarixini `select("*")` bilan oladi — `cost_price_snapshot`/`total_profit` hamma rolga cache'ga tushadi | `src/features/history/history-api.ts:18` | UI ko'rsatmaydi, lekin ma'lumot cache'da mavjud — `stats-api.ts`dagi `view_cost`-gated patternga mos emas. | Ustun ro'yxatini `view_cost` ruxsatiga bog'lang. |

**Priority: S1 va S2 — High (bir-biriga bog'liq, birga tuzatilishi kerak). S3 — Medium.**

### 1.2 Kod sifati / Arxitektura

| # | Muammo | Joyi | Priority |
|---|---|---|---|
| A1 | `sale-queue.ts` — o'lik kod, faqat o'z testida ishlatiladi, productionda `sale-queue-db.ts` alohida SQL bilan qayta yozilgan | `src/lib/offline/sale-queue.ts`, `sale-queue-db.ts` | Medium |
| A2 | Umumiy `BottomSheet` komponenti yo'q — 7+ faylda bir xil Modal boilerplate takrorlanadi (~150 qator) | `payment-sheet.tsx`, `weight-sheet.tsx`, `return-sheet.tsx`, `customer-picker-sheet.tsx`, `supplier-picker-sheet.tsx`, `settings.tsx`, `category-sheet.tsx` | Medium |
| A3 | Render paytida state o'zgartirish (anti-pattern) — `useEffect` yoki `key`-remount o'rniga | `src/app/settings.tsx:41-47` | Low-Medium |
| A4 | `lib/offline/sync.ts` `features/sell/checkout.ts`dan import qiladi — qatlamlar aralashuvi (`lib` → `features`) | `src/lib/offline/sync.ts:1` | Low |
| A5 | Silent `.catch(() => {})` — log/telemetriya yo'q, offline cache yozuvi jimgina muvaffaqiyatsiz bo'lishi mumkin | `checkout.ts:71`, `sync.ts:69`, `payment-sheet.tsx:84` | Low-Medium |
| A6 | Takroriy "rasm+nom+narx" qator layout'i (`ProductRow`, `SaleCard`, `SupplyCartRow`) — umumiy `ListItemCard` yo'q | `katalog.tsx`, `tarix.tsx`, `supply.tsx` | Low |
| A7 | Soya/spacing uchun magic-number CSS qiymatlari takrorlanadi (`theme/shadows.ts` yo'q) | 6+ fayl | Low |

### 1.3 A11y / UI / Performance

| # | Muammo | Priority |
|---|---|---|
| A8 | `accessibilityLabel` deyarli yo'q (butun kodda 1 ta hit) — ikonka-tugmalar screen reader uchun ko'rinmas | Medium |
| A9 | Dark mode yo'q (`useColorScheme`/`dark:` variant yo'q) — OS dark-mode majburlasa system chrome (`Alert.alert`) noto'g'ri ko'rinishi mumkin | Low |
| A10 | Ro'yxat qatorlarida `React.memo`/`useCallback` yo'q — katta katalogda qidiruv paytida re-render | Low |
| A11 | Tablet breakpoint yo'q | Low |

### 1.4 Testlar

- 139 test case / 23 fayl (ROADMAP.md'dagi "34" raqami eskirgan — kamroq ko'rsatilgan, hujjatni yangilash kerak).
- `sale-queue.test.ts` — o'lik kodni test qiladi (A1 bilan bog'liq), yolg'on ishonch beradi.
- Component test (RNTL) yo'q — faqat sof-funksiya testlari; Maestro E2E (login, sell-checkout) mavjud, bu muhim oqimni qisman qoplaydi.

### 1.5 Kuchli tomonlar (o'zgartirmaslik kerak)

- Pul matematikasi (`payment-math.ts`, `cart-total.ts`) — tiyin-yaxlitlash to'g'ri.
- Zustand: faqat 3 store, hammasi field-level selector bilan — re-render muammosi yo'q.
- Offline-sync: mutex, conflict rollback, network-error klassifikatsiyasi — puxta yozilgan.
- Naming convention 13 feature-folder bo'ylab izchil (`use-*`, `*-api.ts`, `*-math.ts`).
- Xatolik xabarlari o'zbek tilida va foydali (masalan `dashboard-cards.tsx:250-254`).

---

## 2-BOSQICH — Web vs Mobile Gap Analysis

**Legend:** ✅ Bor · 🟡 Qisman · ❌ Yo'q

| Modul | Web (`ShopScan_1v`) | Mobile (`uscan_mobile`) | Holat |
|---|---|---|---|
| Login/Signup | ✅ | ✅ | Parity |
| **Parolni tiklash (forgot password)** | ❌ (webda ham yo'q) | ❌ | Ikkalasida ham yo'q — mobile-specific gap emas, lekin ikkalasida ham qo'shish tavsiya etiladi |
| RBAC (6 ruxsat) | ✅ | ✅ | Parity |
| Xodim boshqaruvi (staff invite/permissions) | ✅ | ✅ | Parity |
| **Do'kon almashtirish UI (multi-shop switcher)** | ✅ (topbar dropdown) | ❌ (kod: `memberships[0]` hardcoded, TODO comment "F8 switcher shu yerga ulanadi") | **Gap — High** |
| Savat (dona/vazn) | ✅ | ✅ | Parity |
| Barcode skaner | ✅ (web BarcodeDetector + native ML Kit) | ✅ (vision-camera, ROADMAP'dan ilg'or) | Parity/ahead |
| To'lov usullari (naqd/karta/QR/nasiya) | ✅ | ✅ | Parity |
| Chek chop etish (tizim + Bluetooth ESC-POS) | ✅ | ✅ | Parity |
| **Tarixdan qayta chek chiqarish (reprint)** | ✅ (receipt komponenti qayta ishlatiladi) | ❌ (faqat muvaffaqiyat ekranida) | **Gap — Medium** |
| Mahsulot CRUD + rasm + kategoriya | ✅ | ✅ | Parity |
| **Excel/CSV bulk import** | ✅ (shablon + validatsiya + preview) | ❌ | **Gap — Medium** |
| **Excel bulk export (katalog)** | ✅ | 🟡 (faqat statistika CSV export bor, katalog export yo'q) | **Gap — Low-Medium** |
| Shtrix-kod yorliq chop etish (bitta+ko'p) | ✅ | ✅ | Parity |
| Kam qoldiq aniqlash (avto 20%) | ✅ | ✅ | Parity |
| Kirim (stock receiving) + ta'minotchi | ✅ | ✅ | Parity |
| Sotuvlar tarixi | ✅ | ✅ | Parity |
| Qaytarish (returns) | ✅ | ✅ | Parity |
| Mijozlar/Nasiya (CRUD, balans, to'lov) | ✅ | ✅ | Parity |
| **Telegram qarz eslatmalari (avto+qo'lda)** | ✅ (cron + webhook) | ❌ | **Gap — Medium** (backend integratsiyasi kerak) |
| **Egaga kunlik Telegram hisobot** | ✅ | ❌ | **Gap — Low-Medium** |
| Dashboard (bugungi statistika, trend, top/slow) | ✅ | ✅ | Parity |
| Chuqur hisobot (Statistika) + CSV export | ✅ | ✅ | Parity |
| **Push-bildirishnoma** | ❌ (webda ham yo'q — faqat Telegram) | ❌ | Ikkalasida ham yo'q — mobile uchun yangi imkoniyat (3-bosqichga qarang) |
| **Ko'p til (uz-lotin/kirill/rus)** | ✅ (i18next) | ❌ (faqat uz-lotin, hardcoded) | **Gap — Medium** |
| **Dark mode** | ✅ | ❌ | **Gap — Low** |
| Fiskal/OFD | 🟡 (sxema tayyor, sandbox kutmoqda) | 🟡 (bir xil holat, backend orqali) | Parity (ikkalasi ham progress) |
| QR/ekvayring sozlamalari (Payme kalitlari) | ✅ (settings sahifasi) | N/A (do'kon darajasidagi sozlama — webdan boshqariladi, mobile faqat iste'mol qiladi) | Qasddan — mobile UI kerak emas |
| Feedback/support forma | ✅ | ❌ | Gap — Low (nice-to-have) |
| Mahsulot variantlari (o'lcham/rang) | ❌ (webda ham yo'q) | ❌ | Ikkalasida ham yo'q |
| Chegirma/promo | ❌ (webda ham yo'q) | ❌ | Ikkalasida ham yo'q |
| Do'konlar orasida tovar ko'chirish | ❌ (webda ham yo'q — har bir do'kon mustaqil tenant) | ❌ | Ikkalasida ham yo'q — arxitektura bo'yicha kerak emas |
| Super-admin panel | ✅ (ichki ops) | ❌ | Kerak emas (mobile kassir/egasi uchun, ichki ops emas) |

**Xulosa:** Mobile ilova web bilan **asosiy POS oqimlarida to'liq parity**ga ega
(sotuv, katalog, kirim, qaytarish, nasiya, dashboard). Qolgan bo'shliqlar aniq va
tor: **do'kon almashtirish, Excel import/export, Telegram integratsiyasi, ko'p
til, parolni tiklash, tarixdan reprint**.

---

## 3-BOSQICH — Product Improvement (yangi takliflar)

Faqat webni ko'chirish emas — kichik/o'rta do'kon egasi nuqtai nazaridan yangi
imkoniyatlar:

| # | Taklif | Nega kerak | Foyda | Murakkablik | Priority | Vaqt |
|---|---|---|---|---|---|---|
| P1 | **Push-bildirishnoma** (`expo-notifications`): kam qoldiq, kunlik yakun, nasiya muddati yaqinlashganda | Web/mobile'da hozir FAQAT Telegram orqali xabar bor (do'kon egasi Telegramni sozlamagan bo'lishi mumkin); mobile ilova doim telefonda — push tabiiy kanal | Egasi do'kondan uzoqda bo'lsa ham real-time xabardor bo'ladi | O'rta (EAS push token, backend trigger yo'q — client-side scheduled/local notification bilan boshlash mumkin) | **High** | 1 sprint (~3-4 kun) |
| P2 | **Tezkor sotuv paneli ("Sevimlilar" grid)** — shtrix-kodsiz tez-tez sotiladigan tovarlar (non, sigareta, paket) uchun bosib sotib olish tugmalari, skanerlashsiz | Ko'p kichik do'konda shtrix-kodsiz/yorliqsiz tovar bor; hozir bunday tovar qo'lda qidirilishi kerak — sekin | Sotuv tezligi sezilarli oshadi (eng ko'p ishlatiladigan tugma) | Kichik-o'rta (mavjud `sotuv.tsx` + cart-store ustiga UI) | **High** | 1 sprint (~3-4 kun) |
| P3 | **Smena/kassa yopish (Z-hisobot)** — kun oxirida kutilgan naqd summa vs qo'lda sanalgan summani solishtirish, farqni qayd etish | Bu web'da ham yo'q, lekin har qanday jiddiy POS'ning standart qismi; kassir/egasi hisob-kitobni osonlashtiradi, o'g'irlik/xatoni erta aniqlaydi | Moliyaviy nazorat, ishonch | O'rta (yangi jadval/RPC kerak bo'lishi mumkin — backend o'zgarishi) | **High** | 1.5 sprint |
| P4 | **Ko'p til: kirill + rus** (mobile'da hozir yo'q, webda bor) | Ko'p O'zbekiston foydalanuvchisi kirill yoki rus tilida o'qishni afzal ko'radi — parity gap | Foydalanuvchi bazasi kengayadi | Kichik (i18next + tarjima fayllari, webdan ko'chirish mumkin) | Medium | 1 sprint |
| P5 | **Oddiy xarajat kundaligi (ijaraq, kommunal)** — sotuvdan tashqari xarajatlarni qayd etish, dashboardda "sof foyda (xarajatlardan keyin)" ko'rsatish | Hozir dashboard faqat savdo foydasini ko'rsatadi — real sof foyda uchun ijaraq/kommunal/ish haqi hisobga olinmaydi; kichik do'kon egasi buni qog'ozda alohida yuritadi | To'liq moliyaviy tasvir, boshqa ilovaga ehtiyoj yo'q | O'rta (yangi jadval, RLS, UI) | Medium | 1.5 sprint |
| P6 | **Tarixdan chekni qayta chop etish** | Gap analysis'da aniqlangan — mijoz chekni yo'qotsa yoki qayta so'rasa hozir imkoni yo'q | Kichik lekin kundalik amaliy muammoni yechadi | Kichik (`print-receipt.ts` allaqachon bor, faqat tarix ekraniga tugma) | High (tez, arzon, foydali) | 1-2 kun |
| P7 | **Excel import/export (katalog)** — webdagi import oqimini mobile'ga ko'chirish | Yangi do'kon ro'yxatdan o'tganda 100+ tovarni qo'lda kiritish amaliy emas | Onboarding tezlashadi | O'rta (fayl tanlash, `xlsx` parser RN'da) | Medium | 1 sprint |
| P8 | **Telegram integratsiyasi (nasiya eslatma + kunlik hisobot)** — web bilan bir xil backend'dan foydalanish, mobile faqat ulash/sozlash UI | Web'da mavjud infratuzilma bor, faqat mobile UI yetishmaydi | Egasi kassadan uzoqda ham xabardor | Kichik-o'rta (RPC chaqirish + deep-link ulash) | Medium | 1 sprint |
| P9 | **Barcode-siz tezkor narx kiritish (raqamli klaviatura)** — shtrix-kodsiz tovar uchun narxni to'g'ridan-to'g'ri kiritib sotish | Ba'zi tovarlar (pakovkasiz meva-sabzavot, o'lchov asosida) hech qachon shtrix-kodga ega bo'lmaydi | Universal sotuv qamrovi | Kichik | Low-Medium | 2-3 kun |
| P10 | **Kassir smenasi bo'yicha hisobot** — har bir kassirning kunlik sotuvi/xatosi alohida ko'rinadi (RBAC allaqachon bor, faqat hisobot yo'q) | Bir nechta kassir ishlaydigan do'konlarda javobgarlikni aniqlashtiradi | Boshqaruv nazorati | Kichik (mavjud `sale.created_by` ustuni bo'lsa — tekshirish kerak) | Low-Medium | 2-3 kun |

**Eng yuqori ROI (tezkor + qimmatli):** P6 (reprint) → P2 (tezkor sotuv) → P1
(push) → P3 (Z-hisobot).

---

## 4-BOSQICH — Roadmap / Sprint Planlash

> Tartib: avval xavfsizlik va texnik qarz, keyin yetishmayotgan asosiy
> funksiyalar, keyin yangi mahsulot qiymati, oxirida sayqal.

### Sprint 1 — Critical fixes (xavfsizlik + texnik qarz) — ~3-4 kun
- **Goal:** `cost_price` oqib chiqish xavfini yopish, o'lik kodni tozalash.
- Fixes: S1, S2, S3 (xavfsizlik), A1 (o'lik `sale-queue.ts`), A4 (layering).
- Refactor: yo'q (faqat fix).
- Expected outcome: kassir hech qanday yo'l bilan `cost_price`ni ko'ra olmaydi/cache'ga ololmaydi; testlar yangilanadi (S1-S3 uchun regression test).

### Sprint 2 — Missing core features (parity gap'lar, qism 1) — ~5-6 kun
- **Goal:** Eng ko'zga tashlanadigan parity gap'larni yopish.
- Features: Do'kon almashtirish UI (multi-shop switcher), Tarixdan reprint (P6), Parolni tiklash (forgot password — ikkala platforma uchun ham kerak, lekin bu sprintda faqat mobile UI + Supabase `resetPasswordForEmail`).
- Expected outcome: `memberships[0]` hardcode olib tashlanadi, ko'p-do'konli foydalanuvchi to'liq ishlay oladi.

### Sprint 3 — POS improvements (yangi mahsulot qiymati) — ~5-6 kun
- **Goal:** Sotuvni tezlashtiruvchi yangi imkoniyatlar.
- Features: P2 (Tezkor sotuv/Sevimlilar grid), P9 (shtrix-kodsiz narx kiritish).
- Expected outcome: Kassir tez-tez sotiladigan tovarni 1 bosishda sotadi.

### Sprint 4 — Inventory & Import — ~4-5 kun
- **Goal:** Katalogni boshqarishni osonlashtirish.
- Features: P7 (Excel import/export).
- Bug fixes: A6 (ListItemCard unifikatsiya, agar vaqt qolsa).
- Expected outcome: Yangi do'kon 100+ tovarni bir necha daqiqada import qiladi.

### Sprint 5 — Analytics & Notifications — ~6-7 kun
- **Goal:** Real-time xabardorlik.
- Features: P1 (push-bildirishnoma: kam qoldiq, kunlik yakun, nasiya muddati), P8 (Telegram ulash UI), P10 (kassir-bo'yicha hisobot, agar `created_by` mavjud bo'lsa).
- Expected outcome: Egasi telefon push orqali kritik holatlardan xabardor.

### Sprint 6 — Smena/kassa nazorati — ~5-6 kun
- **Goal:** Moliyaviy nazorat.
- Features: P3 (Z-hisobot/kassa yopish), P5 (xarajat kundaligi — agar vaqt yetsa, aks holda Sprint 7ga suriladi).
- Note: Bu sprint yangi backend jadval/RPC talab qiladi — ShopScan_1v bilan muvofiqlashtirish kerak (backend umumiy).

### Sprint 7 — Polish & Release — ~4-5 kun
- **Goal:** Sifat va release tayyorgarligi.
- Refactoring: A2 (umumiy `BottomSheet` komponenti), A8 (accessibility label'lar), A9 (dark mode — agar priority bo'lsa), P4 (kirill/rus tili).
- Testing: yangi funksiyalar uchun unit/E2E testlar, ROADMAP.md'ni yangilash (eskirgan holatni tuzatish).
- Expected outcome: Kod bazasi toza, test qamrovi yangi funksiyalarni qoplaydi, hujjatlar aniq.

---

## Keyingi qadam

Ushbu hujjat tasdiqlangач, **Sprint 1** dan boshlab (`fix/cost-price-leak` yoki
shunga o'xshash branch nomi bilan) 5-bosqich (real development workflow)
boshlanadi: branch → kichik commit'lar (Conventional Commits) → test → PR.

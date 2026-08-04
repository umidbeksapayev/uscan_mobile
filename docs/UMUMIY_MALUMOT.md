# uscan mobile — umumiy ma'lumot

> Kichik va o'rta do'konlar uchun **mobil savdo nuqtasi (POS)** ilovasi.
> React Native + Expo asosida qurilgan, `ShopScan_1v` veb ilovasi bilan
> **bir xil Supabase backend**dan foydalanadi.
>
> Hujjat holati: 2026-08-03. Kod bo'yicha tekshirilgan.

---

## 1. Maqsad

### Muammo

O'zbekistondagi ko'p kichik do'konlar savdoni hanuz **qog'oz daftarda** yoki
kompyuterga bog'langan qimmat POS terminallarida yuritadi. Bundan kelib
chiqadigan kundalik og'riqlar:

- **Qoldiq noaniq** — nima qolgani, nima tugagani faqat qo'lda sanaganda ma'lum.
- **Nasiya daftarda** — kim qancha qarzdor, qachon to'laydi — eslab qolish kerak.
- **Foyda hisoblanmaydi** — tushum ko'rinadi, lekin tan narx va xarajatlardan
  keyingi **sof foyda** noma'lum.
- **Kassa nazorati yo'q** — kun oxirida kassadagi pul to'g'ri kelyaptimi,
  kamomad bormi — tekshirib bo'lmaydi.
- **Egasi do'konda bo'lishi shart** — uzoqdan nima bo'layotganini bilmaydi.
- **Internet uzilsa savdo to'xtaydi** — bulutga bog'liq tizimlarning zaif joyi.

### Yechim

uscan mobile — do'kon egasining **telefonidagi to'liq POS**. Qo'shimcha
qurilma shart emas: telefon kamerasi skanerga aylanadi, Bluetooth printer
ixtiyoriy. Ilova quyidagilarni bitta joyga yig'adi:

**Savdo → Qoldiq → Nasiya → Kirim → Xarajat → Foyda → Hisobot**

### Asosiy tamoyillar

| Tamoyil | Amalda nimani anglatadi |
|---|---|
| **Offline-first** | Internet yo'q bo'lsa ham sotuv davom etadi, keyin avtomatik yuboriladi |
| **Bir qo'l bilan ishlash** | Kassir telefonni bir qo'lda ushlab sotadi — tugmalar pastda, yirik |
| **Tan narx maxfiy** | Kassir hech qanday yo'l bilan tan narx/foydani ko'rmaydi |
| **Web bilan bir xil ma'lumot** | Kompyuterdagi va telefondagi ma'lumot bitta baza — sinxronlash shart emas |
| **Mahalliy kontekst** | So'm, `2 450 000` formati, o'zbek/rus tili, Toshkent vaqti |

---

## 2. Kimlar uchun

| Foydalanuvchi | Nima qiladi |
|---|---|
| **Do'kon egasi** | To'liq huquq: savdo, katalog, narxlar, hisobotlar, foyda, xodimlar, xarajatlar |
| **Kassir / sotuvchi** | Faqat ega ruxsat bergan bo'limlar. Odatda: sotuv, qoldiq ko'rish, chek chiqarish |
| **Bir nechta do'kon egasi** | Ilova ichida do'konni almashtiradi — har biri mustaqil hisob yuritadi |

---

## 3. Foydalari

### Do'kon egasi uchun

- **Sof foyda ko'rinadi.** Faqat tushum emas: tan narx ayiriladi, ijara/kommunal
  kabi xarajatlar ham hisobga olinadi. Dashboardda "xarajatlardan keyingi
  sof foyda" ko'rsatiladi.
- **Do'kondan uzoqda ham nazorat.** Telefon bildirishnomalari va Telegram orqali
  kunlik yakun keladi; kam qoldiq haqida ogohlantiriladi.
- **Kassaga ishonch.** Kun oxirida Z-hisobot: tizim kutgan naqd summa vs qo'lda
  sanalgan summa. Farq bo'lsa — darhol ko'rinadi va yozib qo'yiladi.
- **Kassir javobgarligi aniq.** Har bir sotuv kim tomonidan qilingani saqlanadi,
  kassir kesimida hisobot bor.
- **Tan narx sir saqlanadi.** Kassir mahsulotni sotadi, lekin uning sizga
  qanchaga tushganini bilmaydi.
- **Ish boshlash tez.** 100+ mahsulotni qo'lda kiritish shart emas — CSV'dan
  ommaviy import qilinadi.

### Kassir uchun

- **Sotuv tez.** Skaner → savat → to'lov. Tez-tez sotiladigan mahsulotlar
  alohida panelda — bir bosishda savatga tushadi.
- **Shtrix-kodsiz mahsulot muammo emas.** Narxni to'g'ridan-to'g'ri kiritib
  sotish mumkin (non, meva-sabzavot, pakovkasiz tovar).
- **Vaznli tovar oson.** "20 000 so'mlik" desa — summani kiritadi, kilogrammni
  ilova o'zi hisoblaydi. Yoki teskarisi.
- **Internet uzilsa ham ishlaydi.** Sotuv telefonda saqlanadi, ulanish
  tiklanganda o'zi yuboriladi.
- **Xato tuzatiladi.** Qaytarish (return) alohida oqim sifatida mavjud.

### Biznes uchun

- **Qo'shimcha qurilma xarajati yo'q** — telefon yetarli. Bluetooth chek
  printeri ixtiyoriy.
- **Bitta baza, ikki qurilma** — kompyuterda (web) va telefonda bir xil
  ma'lumot, qo'shimcha sinxronlash yoki eksport-import shart emas.
- **Ma'lumot yo'qolmaydi** — bulutda saqlanadi, telefon sinsa ham qoladi.

---

## 4. Asosiy imkoniyatlar

### 4.1 Sotuv (POS)

- Kamera orqali **shtrix-kod skaneri** (ML Kit / VisionCamera).
- Savat: dona va **kg (vaznli tovar)** — summa↔vazn ikki tomonlama hisob.
- **Tez-tez sotiladigan tovarlar paneli** — skanerlashsiz bir bosishda savatga.
- **Tezkor narx** — katalogda yo'q tovarni narxini kiritib sotish.
- To'lov usullari: **naqd · karta · QR (ekvayring) · nasiya**.
- Chek: tizim printeri (`expo-print`) yoki **Bluetooth ESC/POS** printer.
- Pul matematikasi tiyinda yaxlitlanadi — float xatolik yo'q.

### 4.2 Katalog va qoldiq

- Mahsulot CRUD: nom, shtrix-kod, narx, tan narx, kategoriya, rasm, tur (dona/kg).
- **Kategoriyalar** boshqaruvi.
- **Kam qoldiq** avtomatik aniqlanadi (20% chegara) va ajratib ko'rsatiladi.
- **CSV import** — shablon + validatsiya + oldindan ko'rish (preview).
- **CSV eksport** — butun katalogni fayl sifatida ulashish.
- **Narx yorlig'i chop etish** — shtrix-kod + narx (bitta yoki ommaviy),
  Code128 generatori ilova ichida.

### 4.3 Kirim (ta'minot)

- Ta'minotchilar bazasi.
- Kirim hujjati: mahsulot + miqdor + tan narx → qoldiq avtomatik oshadi.

### 4.4 Nasiya (qarz daftari)

- Mijozlar bazasi (ism, telefon).
- Nasiyaga sotish, balans yuritish, **qarz to'lovini qabul qilish**.
- Mijoz kesimida to'lovlar va sotuvlar tarixi.
- Telegram orqali qarz eslatmasi (backend web tomonda).

### 4.5 Kassa nazorati

- **Kassa yopish / Z-hisobot** — kutilgan naqd (server hisobi: naqd sotuvlar −
  naqd qaytarishlar + nasiya naqd to'lovlari) vs sanalgan naqd; farq
  rangli ko'rsatkich bilan (mos / ortiqcha / kamomad) + izoh.
- Yopilishlar tarixi. Kassir faqat o'zinikini, ega hammasini ko'radi.
- **Xarajatlar kundaligi** — ijara, kommunal va h.k. (faqat ega uchun),
  dashboardda sof foydaga ta'sir qiladi.

### 4.6 Hisobot va tahlil

- **Dashboard**: bugungi tushum, savdo soni, o'rtacha chek, trend grafigi,
  eng ko'p/kam sotilgan mahsulotlar, kam qoldiq ro'yxati.
- **Statistika** ekrani: davr bo'yicha chuqur hisobot + **CSV eksport**.
- **Kassir kesimidagi hisobot** — har bir xodimning natijasi alohida.
- Tan narx/foyda ko'rsatkichlari `view_cost` ruxsatiga bog'langan.

### 4.7 Sotuvlar tarixi

- Sahifalab yuklash (pagination), qidiruv.
- **Qaytarish (return)** — to'liq yoki qisman.
- **Chekni qayta chop etish** — mijoz chekni yo'qotsa.

### 4.8 Offline rejim

- Sotuv `expo-sqlite` navbatiga yoziladi, ulanish tiklanganda **avtomatik
  yuboriladi**.
- `client_id` **idempotency** — qayta yuborilsa ham dublikat sotuv yaratilmaydi.
- Navbat **serial** drenaj qilinadi (har sotuv qoldiqni kamaytiradi), MMKV
  mutex bilan bir vaqtda faqat bitta jarayon.
- Konflikt (masalan qoldiq yetmasa) aniqlanadi va rollback qilinadi.
- Mahsulot katalogi lokal keshda — offline'da ham qidiruv ishlaydi.
- "Yuborilmagan sotuvlar" ekrani: holat (kutilmoqda/yuborilmoqda/xato) va
  qo'lda qayta urinish.

### 4.9 Bildirishnomalar

- **Lokal eslatmalar** (`expo-notifications`): kunlik yakun belgilangan vaqtda,
  kam qoldiq ogohlantirishi.
- **Telegram**: egani bot orqali do'konga ulash (deep-link + bir martalik
  token), kunlik xulosa vaqtini sozlash.

### 4.10 Sozlamalar va interfeys

- **3 til**: O'zbekcha (lotin) · Ўзбекча (kirill) · Русский. Tanlov saqlanadi.
- **Tungi rejim**: Tizim / Yorqin / Tungi.
- Do'kon almashtirish (multi-shop).
- Xodim boshqaruvi: taklif qilish, ruxsatlarni yoqish/o'chirish.
- Printer sozlamalari (Bluetooth qurilma tanlash).
- Parolni tiklash.

---

## 5. Rollar va ruxsatlar (RBAC)

Ega (`owner`) — **har doim to'liq huquq**. Kassir uchun ega quyidagi 6 ta
ruxsatni alohida yoqadi:

| Ruxsat | Nimaga ochadi |
|---|---|
| `manage_products` | Mahsulot qo'shish/tahrirlash, kategoriyalar, import |
| `purchase` | Kirim qilish, tan narx kiritish |
| `returns` | Sotuvni qaytarish |
| `manage_debt` | Nasiya daftari va qarz to'lovlari |
| `view_reports` | Statistika va savdo hisoboti |
| `view_cost` | **Tan narx va foydani ko'rish** |

> Ruxsat tekshiruvi ikki qatlamda: UI'da (`canDo`) va **DB tomonida RLS +
> `has_perm`**. Ya'ni ilovani chetlab o'tib ham ma'lumot olib bo'lmaydi.

---

## 6. Ekranlar

```
(auth)                       Kirish
├── login                    Tizimga kirish
├── register                 Ro'yxatdan o'tish
├── forgot-password          Parolni tiklash so'rovi
└── reset-password           Yangi parol o'rnatish

(tabs)                       Asosiy navigatsiya — QAT'IY 5 tugma
├── index      Bosh          Dashboard: bugungi ko'rsatkichlar, trend, top/kam
├── sotuv      Sotuv         Savat, skaner, tez-tez sotiladiganlar, to'lov
├── katalog    Katalog       Mahsulotlar, qidiruv, qoldiq
├── tarix      Tarix         Sotuvlar tarixi, qaytarish, qayta chek
└── koproq     Ko'proq       Qolgan bo'limlarga menyu

Ko'proq ichidagi ekranlar
├── statistika               Chuqur hisobot + CSV eksport
├── shift-close              Kassani yopish (Z-hisobot)
├── expenses                 Xarajatlar kundaligi          [faqat ega]
├── nasiya                   Qarz daftari                  [manage_debt]
├── supply                   Kirim                         [purchase]
├── categories               Kategoriyalar                 [manage_products]
├── import-products          CSV import                    [manage_products]
└── settings                 Sozlamalar

Boshqa ekranlar
├── scanner                  Shtrix-kod skaneri (to'liq ekran)
├── product-form             Mahsulot qo'shish/tahrirlash
├── customer-form            Mijoz qo'shish/tahrirlash
├── customer-detail          Mijoz kartasi: balans, tarix
├── suppliers                Ta'minotchilar
├── offline-sales            Yuborilmagan sotuvlar navbati
└── printer-settings         Bluetooth printer
```

---

## 7. Texnik stack

| Qatlam | Texnologiya |
|---|---|
| Framework | Expo SDK 54 · React Native 0.81 · Expo Router (file-based) |
| Til | TypeScript |
| Styling | NativeWind 4 (Tailwind) — CSS o'zgaruvchilari orqali tungi rejim |
| Server holati | TanStack Query (+ AsyncStorage persist) |
| Lokal holat | Zustand (savat, faol do'kon, offline, printer, mavzu, ...) |
| Backend | Supabase (`@supabase/supabase-js`) — web bilan **bir xil loyiha** |
| Offline | expo-sqlite (sotuv navbati) · react-native-mmkv (KV) · NetInfo |
| Skaner | react-native-vision-camera (ML Kit) |
| Chek | expo-print · react-native-bluetooth-classic (ESC/POS) |
| QR | react-native-qrcode-svg |
| i18n | i18next · react-i18next |
| UI | @gorhom/bottom-sheet · reanimated · gesture-handler |
| Validatsiya | zod |
| Build | EAS Build (bulut) · expo-updates (OTA) |
| Test | Jest (jest-expo) · Maestro (E2E) |

---

## 8. Arxitektura

**Feature-based** tuzilma — har bir biznes sohasi o'z papkasida, ichida API,
hook, sof matematik funksiya va UI birga turadi.

```
src/
├── app/                 Expo Router yo'llari (ekranlar)
├── components/          Umumiy UI (tab-bar, bottom-sheet, button, field, ...)
├── features/            Biznes modullar
│   ├── auth/            Sessiya, RBAC, do'kon almashtirish
│   ├── sell/            Savat, to'lov, ekvayring, vazn/narx matematikasi
│   ├── products/        Mahsulot validatsiya, CSV import/eksport, rasm
│   ├── catalog/         Katalog va kategoriya so'rovlari
│   ├── customers/       Mijoz va nasiya
│   ├── suppliers/       Ta'minotchilar
│   ├── supply/          Kirim
│   ├── history/         Sotuvlar tarixi, qaytarish
│   ├── shift/           Kassa yopish (Z-hisobot)
│   ├── expenses/        Xarajatlar
│   ├── dashboard/       Bosh sahifa ko'rsatkichlari
│   ├── stats/           Hisobot, CSV, kassir kesimi
│   ├── print/           Chek shabloni, ESC/POS
│   ├── labels/          Narx yorlig'i, Code128
│   ├── notifications/   Lokal eslatmalar
│   └── telegram/        Egani botga ulash
├── lib/                 supabase · format · offline/ · uuid · toast
├── i18n/                Tarjimalar (uz-Latn · uz-Cyrl · ru)
├── theme/               colors.ts (palitra) · theme-store.ts (tungi rejim)
└── types/               database.ts
```

### Nomlash konvensiyasi

`use-*.ts` (hook) · `*-api.ts` (server so'rovlari) · `*-math.ts` (sof funksiya,
test qilinadigan) · `*-sheet.tsx` (pastdan chiqadigan oyna).

Sof matematika API'dan **ajratilgan** — shu sabab pul, vazn, qarz va farq
hisoblari qurilmasiz test qilinadi.

---

## 9. Muhim qoidalar

- **Pul DB'da `DECIMAL` so'm** (tiyin EMAS). Vazn — `DECIMAL` kg.
  `formatCurrency(som)` / `formatWeight(kg)`. Savat summasi client'da tiyinda
  yaxlitlanadi (float drift oldini olish).
- **`cost_price` kassir ekranida HECH QACHON ko'rsatilmaydi** — faqat UI'da
  yashirish emas, so'rovlar ham ustunni tanlamaydi (cache'ga ham tushmaydi).
- **RLS** avtomatik `shop_id` bo'yicha filtrlaydi.
- **Offline sotuvda `client_id` idempotency** (migration 019).
- Raqam formati: **bo'sh joy** (`2 450 000`), valyuta — **so'm**.
- Brend: `#2F80ED` (urg'u) · `#0F3D6E` (asosiy) · `#7DB4F5` (ochiq).
- Pastki navigatsiya — **qat'iy 5 tugma**.

---

## 10. Sifat va testlar

- **33 test fayl / 213 test case** (Jest) — pul matematikasi, vazn, qarz,
  yaxlitlash, CSV, ruxsatlar, offline sync, chek shabloni, Code128 va h.k.
- **Maestro E2E**: smoke · login · sotuv-checkout (kritik yo'llar).
- TypeScript `strict` rejimda.

```bash
npm test          # Jest
npx tsc --noEmit  # tip tekshiruvi
```

---

## 11. Ishga tushirish

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` ichiga yoziladi:

| O'zgaruvchi | Vazifasi |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase loyiha manzili (web bilan bir xil) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key — public, RLS himoyalaydi |
| `EXPO_PUBLIC_WEB_URL` | Web deploy manzili. **Bo'sh bo'lsa QR ekvayring oqimi yoqilmaydi** (oddiy "QR" turi baribir ishlaydi) |

```bash
npm start
```

> **Muhim:** kamera (skaner) va Bluetooth chop etish uchun **custom dev build**
> (`expo-dev-client`) kerak — Expo Go bu native modullarni qo'llab-quvvatlamaydi.
> Build EAS bulutida qilinadi.

---

## 12. Web ilova bilan munosabat

`ShopScan_1v` (Next.js) va `uscan_mobile` — **bitta Supabase loyihasi**, bitta
ma'lumotlar bazasi. Mobil ilova backendni qayta qurmaydi, faqat yangi client.

- **Migratsiyalar web repo'da** (`ShopScan_1v/supabase/`) raqam tartibida
  qo'lda ishga tushiriladi. Mobil uchun qo'shilganlari: `030_shift_close.sql`
  (kassa yopish), `031_expenses.sql` (xarajatlar), `032_push_tokens.sql`
  (push bildirishnoma).
- Asosiy POS oqimlarida (sotuv, katalog, kirim, qaytarish, nasiya, dashboard)
  **to'liq parity** mavjud.
- Ataylab faqat webda qolganlar: super-admin panel, QR/ekvayring kalitlarini
  sozlash (do'kon darajasidagi sozlama).

---

## 13. Holat va keyingi qadamlar

**Bajarilgan:** F0–F11 bosqichlari va audit sprintlari 1–**8** — xavfsizlik
tuzatishlari, do'kon almashtirish, qayta chek, parol tiklash, tezkor sotuv,
CSV import/eksport, bildirishnomalar, kassa yopish, xarajatlar, i18n (3 til),
umumiy BottomSheet, accessibility yorliqlari, tungi rejim.

**Sprint 8 (2026-08-04) qo'shganlari:**

- Fikr-mulohaza formasi (Sozlamalar > Umumiy).
- Xatolik jurnali + **Diagnostika** ekrani — ilgari jim yutilgan xatolar
  endi qurilmada saqlanadi va ulashiladi (telemetriya yuborilmaydi).
- `theme/shadows.ts` soya tokenlari, `ListItemCard`/`ListRow`/`Avatar`/
  `EmptyState` umumiy komponentlari, ro'yxatlarda `React.memo`.
- 34 ta ikonka-tugmaga accessibility yorlig'i va roli.
- i18n to'liq yopildi + `locale-parity` testi (kalitlar drift'ini ushlaydi).
- **Push bildirishnoma** — kunlik xulosa serverdan (migration `032`,
  web `lib/push/`, mavjud ikkala cron route'ga ulangan). Lokal eslatma
  zaxira kanal sifatida saqlanib qoldi.

**Ochiq qolgan:**

- Fiskal/OFD — Payme sandbox ochilganda.
- ESLint sozlanmagan (`npm run lint` ishlamaydi) — alohida ish.

Batafsil: `docs/AUDIT_AND_ROADMAP_2026-07.md` · `docs/SPRINT_PLAN_2026-07.md`

---

## 14. Ish tartibi

```
branch → kichik Conventional Commits (o'zbekcha) → tsc + jest yashil → PR → merge
```

Backend migratsiyalar web repo'da raqam tartibida qo'lda ishga tushiriladi.

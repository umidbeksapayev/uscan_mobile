# Qurilmada sinov ro'yxati

Har sprintdan keyin qurilmada bosib chiqiladigan ro'yxat. Maqsad — emulyator
yoki `tsc`/`jest` topa olmaydigan narsalarni ushlash: uslub yo'qolishi, bosish
maydonlari, kamera, printer, push.

## 0. Qaysi build kerak

| O'zgarish turi | Yetarli |
|---|---|
| Faqat JS/TSX, tarjima, uslub | `npm start` (dev build ulanadi) yoki OTA |
| Yangi native paket, `app.json`, `google-services.json` | **Yangi dev build** |

Sprint 11–13 o'zgarishlari **JS-only** — yangi build kerak emas
(Reanimated allaqachon o'rnatilgan, yangi native modul qo'shilmadi).

⚠️ Sprint 13 build emas, **DB** talab qiladi: `ShopScan_1v/supabase/
migrations/033_cashier_report.sql` Supabase SQL Editor'da bajarilgan
bo'lsin.

```bash
npm start
```

> Metro keshi shubhali bo'lsa: `npx expo start --clear`.
> Sprint 12 da uslub tokenlari o'zgargani uchun **NativeWind keshi** eskirgan
> bo'lishi mumkin — o'lchamlar eski ko'rinsa aynan shu buyruq bilan tozalang.

---

## 1. Sprint 13 — Kassir hisoboti

> Migration 033 Supabase'da bajarilgan bo'lishi shart. Bajarilmagan bo'lsa
> ekran "migration 033 ni ishga tushiring" deb yozadi — bu xato emas, izoh.

### 1.1 Ruxsatlar (eng muhim qism)

Hisobotning butun mantig'i shu yerda — noto'g'ri ishlasa, kassir boshqa
kassirning yoki do'konning foydasini ko'rib qoladi.

- [ ] **Egadan** oching (Ko'proq → Kassir hisoboti): barcha kassirlar
      ko'rinsin, har birida **foyda** va **qaytarish** bo'lsin.
- [ ] **Kassir hisobidan** oching: **faqat o'z qatori** ko'rinsin.
- [ ] Kassirda **foyda ustuni umuman bo'lmasin** (0 emas — yo'q).
- [ ] Kassirda **qaytarish qatori umuman bo'lmasin**.
- [ ] Kassirda yuqorida "Siz faqat o'z natijangizni ko'rasiz" yozuvi chiqsin.

### 1.2 Raqamlar to'g'riligi

- [ ] **Statistika bilan solishtiring**: bir xil davrda (masalan "Oy")
      kassirlar tushumi ikkala ekranda **bir xil** bo'lsin.
      ⚠️ Farq chiqsa — bu men kutmagan holat, albatta aytib qo'ying.
- [ ] O'rtacha chek ≈ tushum ÷ sotuv soni (qo'lda tekshirib ko'ring).
- [ ] Davr tanlagich (Bugun · Hafta · Oy) — raqamlar mos ravishda o'zgarsin.
- [ ] "Jami" kartasi faqat **bir nechta** kassir bo'lganda chiqsin.

### 1.3 To'lov usullari chizig'i

- [ ] Ranglar izoh (legend) bilan mos bo'lsin.
- [ ] Foizlar taxminan 100% ga yig'ilsin.
- [ ] Ishlatilmagan usul (masalan QR yo'q bo'lsa) chiziqda **ko'rinmasin**.

### 1.4 Chekka holatlar

- [ ] Sotuv bo'lmagan davr: "Bu davrda sotuv yo'q" kartasi.
- [ ] Eski sotuvlar (kassir belgilanmagan) bo'lsa — "Noma'lum" qatori.
- [ ] Statistikadagi "Kassir hisoboti" havolasi ekranni ochsin.
- [ ] Uch tilda tekshiring (Sozlamalar → Til).

---

## 2. Sprint 12 — dizayn tizimi

> ⚠️ Sprint 12 ning **uchala bosqichi ham ko'rinishga tegadi** va ular
> ustma-ust to'plangan (o'lcham → primitivlar → harakat). Muammo topilsa,
> qaysi bosqich sababchi ekanini aytish uchun ekran nomini va nima
> noto'g'ri ko'rinayotganini yozib qo'ying — commitlar alohida, orqaga
> qaytarish oson.

### 2.1 O'lchamlar (matn va radius)

Ilgari kodda 14 xil radius va 13 xil shrift o'lchami bor edi; ular yagona
shkalaga tortildi. Amalda **36 ta joyda matn 1px kattalashdi**.

- [ ] **Savat qatorlari** (Sotuv) — mahsulot nomi bir qatorga sig'sin,
      ikkiga tushib ketmasin.
- [ ] **Katalog** — mahsulot nomi va narxi qator ichida kesilmasin.
- [ ] **Tarix** — sotuv qatorlari qalashib qolmasin.
- [ ] Kartalar chetlari bir xil yumaloqlikda ko'rinsin (ilgari 16 va 18
      aralash edi — yonma-yon turgan kartalarda sezilardi).
- [ ] Nishonlar (`3/6`, qoldiq belgilari) to'liq **oval** bo'lsin, burchakli
      emas.

### 2.2 Header (barcha ekranlarda bir xil)

15 ta ekranda header qo'lda yozilgan edi va har birida biroz boshqacha.
Endi bittasi.

- [ ] Quyidagi ekranlarni ochib chiqing — **orqaga tugmasi bir xil
      o'lchamda va sarlavha ko'k rangda** bo'lsin:
      Sozlamalar · Kassa yopish · Printer · Diagnostika · Statistika ·
      Kategoriyalar · Nasiya · Mijoz · Mijoz formasi · Xarajatlar ·
      Ta'minotchilar · Kirim · Import · Bildirishnomalar · Yuborilmagan sotuvlar
- [ ] **O'ng tomonida tugmasi bor to'rttasi** alohida tekshirilsin —
      joyi siljib qolmaganini ko'ring:
      - Diagnostika → ulashish + tozalash
      - Xarajatlar → hafta/oy tanlagichi
      - Kirim → ta'minotchilar
      - Mijoz → tahrirlash
- [ ] **Kirim** va **Import** ekranlarida ikkita header bor edi (yuklanish
      holati va asosiy ko'rinish) — ikkalasi ham bir xil chiqsin.

### 2.3 Bosilish javobi

- [ ] **Sotuv → To'lash** tugmasi bosilganda biroz kichraysin
      (ilovadagi eng ko'p bosiladigan tugma).
- [ ] Orqaga tugmasi bosilganda javob bersin.
- [ ] **Nasiya / Xarajatlar / Ta'minotchilar** ro'yxat qatorlari bosilganda
      kichraysin.
- [ ] Uchta FAB (+ tugmalari) bosilganda kichraysin.

### 2.4 Skeleton yuklanish

- [ ] **Nasiya**, **Xarajatlar**, **Ta'minotchilar** — ochilganda aylanuvchi
      doira o'rniga kulrang qator o'rindiqlari ko'rinsin, ular sekin
      "nafas olsin".
- [ ] Ma'lumot kelganda sahifa **sakramasin** (o'rindiq va haqiqiy qator
      taxminan bir balandlikda).

### 2.5 Harakatni kamaytirish (a11y)

Sozlamalarda animatsiyani o'chirib qo'ying, keyin:

- [ ] Bosilganda **kichrayish bo'lmasin** (bosish o'zi ishlashda davom etsin).
- [ ] Skeleton **pulsi to'xtasin** (kulrang qoladi, lekin qimirlamaydi).
- [ ] Skanerdagi lazer chizig'i qimirlamasin.

### 2.6 Tungi rejim

- [ ] Skeleton o'rindiqlari fonda ko'rinsin (juda och yoki juda to'q emas).
- [ ] Karta chegaralari yo'qolmasin — Sprint 12 da 0.5px chegaralar 1px ga
      o'tkazildi, aynan shu tungi rejimda ba'zi qurilmada ko'rinmasdi.

---

## 3. Sprint 11 — yangi o'zgarishlar

### 3.1 Raqamlar (tabular shrift)

Maqsad: raqam o'zgarganda **matn sakramasligi**, ustundagi narxlar tekis turishi.

- [ ] **Sotuv** — savatga mahsulot qo'shib boring. Pastdagi **jami** summa
      har o'zgarganda chapga-o'ngga qimirlamasin.
- [ ] **Sotuv** — savatda 3+ mahsulot bo'lsa, o'ngdagi qator summalari bir
      vertikal chiziqda tursin.
- [ ] **Bosh sahifa** — tushum/foyda kartalari; raqamlar kesilmasin.
- [ ] **Statistika** — top mahsulotlar va kassirlar ro'yxatidagi summalar.
- [ ] **Nasiya** — mijozlar ro'yxatidagi balanslar ustuni.
- [ ] **Kassa yopish** — "Kutilgan / Sanalgan / Farq" uchtasi bir xil
      kenglikda tursin (bu ekranda solishtirish eng muhim).
- [ ] **Tarix** — sotuv summalari.

> Agar biror ekranda raqam **buzilgan yoki juda siqilgan** ko'rinsa — bu
> `fontVariant: ["tabular-nums"]` ni shrift qo'llab-quvvatlamayotgani bo'ladi;
> shu ekranni aytib qo'ying.

### 3.2 Harakatni kamaytirish (a11y)

- [ ] Android: *Sozlamalar → Maxsus imkoniyatlar → Animatsiyalarni o'chirish*
      (yoki iOS: *Accessibility → Motion → Reduce Motion*) — YOQING.
- [ ] Skanerni oching: lazer chizig'i **qimirlamasin**, ramka o'rtasida
      tursin. Skanerlashning o'zi ishlashda davom etsin.
- [ ] Sozlamani o'chiring — chiziq yana tebransin.

### 3.3 Tipografika

- [ ] Yuklanish matnlari `…` bilan tugasin (`...` uchta nuqta emas):
      "Yuklanmoqda…", "Saqlanmoqda…", "Kirilmoqda…".
- [ ] Uch tilda ham tekshiring (Sozlamalar → Til).

### 3.4 Ekran o'quvchi (ixtiyoriy, lekin foydali)

- [ ] TalkBack/VoiceOver yoqib, **Sotuv** ekranidagi "Tez-tez sotiladigan"
      plitkasini bosing — nom va narx **bitta tugma** bo'lib o'qilsin.

---

## 4. Sprint 10 regressiyasi (hali qurilmada tasdiqlanmagan)

Bu o'zgarishlar kod darajasida tuzatilgan, ammo qurilmada ko'rilmagan.

### 4.1 BottomSheet uslublari (ildiz sabab tuzatilgan)

Har bir oyna ochilsin va **tugmalar to'liq balandlikda, fon bilan** chiqsin
(ilgari ~25px, fonsiz edi):

- [ ] To'lov oynasi (Sotuv → To'lash) — **tanlangan to'lov usuli ko'rinsin**
      (ilgari oq matn + oq fon = ko'rinmasdi)
- [ ] Vazn oynasi (vaznli mahsulot)
- [ ] Tezkor narx oynasi
- [ ] Mijoz tanlash · Ta'minotchi tanlash · Ta'minotchi formasi
- [ ] Kategoriya oynasi · Xarajat formasi · Qaytarish oynasi
- [ ] Do'kon almashtirish · Fikr bildirish · Kirimga mahsulot qo'shish

### 4.2 Savat kartasi

- [ ] Bir ekranda 7-8 mahsulot ko'rinsin (ilgari 3-4).
- [ ] **"+" tugmasining o'ng chetini bosing** — mahsulot tasodifan
      o'chib ketmasin (hitSlop ustma-ustligi tuzatilgan).
- [ ] "Tez-tez sotiladigan" panel savat bo'sh emasligida yashirilsin.

### 4.3 To'lov oynasi mantiqi

- [ ] Ekvayring **sozlanmagan** do'konda "QR to'lov" ko'rinmasin.
- [ ] "Plastik" bilan sotuv → **Kassa yopish**da kutilgan naqd summasiga
      qo'shilmasin (soxta kamomad chiqmasin).

### 4.4 Bildirishnomalar markazi

- [ ] Bosh sahifa header'idagi qo'ng'iroqcha + sanoq ko'rinsin.
- [ ] Sanoq — muammo **turlari** soni (masalan "kam qoldiq" + "qarzdor" = 2),
      mahsulotlar yig'indisi emas.
- [ ] Qarzdorlar ro'yxati ochilsin.
- [ ] **Kunlik xulosa kartasi** — faqat do'kon **egasida** ko'rinsin,
      kassirda ko'rinmasin (kassirga xulosa hech qachon yuborilmaydi).

---

## 5. Doimiy asosiy oqim (har sprintda)

- [ ] Kirish → do'kon tanlash
- [ ] Skaner bilan sotuv → chek chiqarish
- [ ] Internetsiz sotuv → internet qaytganda sinxronlanish
- [ ] Mahsulot qo'shish/tahrirlash → katalogda ko'rinishi
- [ ] Nasiya: qarz yozish → to'lov qabul qilish
- [ ] Tungi rejim: barcha ekranlarda matn o'qilishi

---

## 6. Xato topilsa

Sozlamalar → **Diagnostika** ekranida oxirgi 50 ta xato jurnali bor —
skrinshot yoki matnini yuboring, bu ildiz sababni topishni tezlashtiradi.

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

### 1.1 Ruxsatlar (eng muhim qism) ✅ 2026-08-14 qurilmada tasdiqlandi

Hisobotning butun mantig'i shu yerda — noto'g'ri ishlasa, kassir boshqa
kassirning yoki do'konning foydasini ko'rib qoladi.

- [x] **Egadan** oching (Ko'proq → Kassir hisoboti): barcha kassirlar
      ko'rinsin, har birida **foyda** va **qaytarish** bo'lsin.
- [x] **Kassir hisobidan** oching: **faqat o'z qatori** ko'rinsin.
- [x] Kassirda **foyda ustuni umuman bo'lmasin** (0 emas — yo'q).
- [x] Kassirda **qaytarish qatori umuman bo'lmasin**.
- [x] Kassirda yuqorida "Siz faqat o'z natijangizni ko'rasiz" yozuvi chiqsin.

> ⚠️ Eslatma: shu sinov paytida **Statistika** ekranida (kassir hisobotidan
> boshqa, umumiy `/statistika`) kassir tushum va foydani ko'rdi — sabab
> kod xatosi emas, o'sha test-kassir hisobida "Hisobotlar" / "Tan narx" +
> "foyda" ruxsatlari oldindan yoqilgan edi (Sozlamalar → Xodimlar). DB va
> client tomonida default = yopiq (`has_perm` bo'sh `permissions` bilan
> `false`), tasdiqlandi.

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

## 2. Sprint 12 — dizayn tizimi ✅ 2026-08-14 qurilmada tasdiqlandi

> ⚠️ Sprint 12 ning **uchala bosqichi ham ko'rinishga tegadi** va ular
> ustma-ust to'plangan (o'lcham → primitivlar → harakat). Muammo topilsa,
> qaysi bosqich sababchi ekanini aytish uchun ekran nomini va nima
> noto'g'ri ko'rinayotganini yozib qo'ying — commitlar alohida, orqaga
> qaytarish oson.

### 2.1 O'lchamlar (matn va radius)

Ilgari kodda 14 xil radius va 13 xil shrift o'lchami bor edi; ular yagona
shkalaga tortildi. Amalda **36 ta joyda matn 1px kattalashdi**.

- [x] **Savat qatorlari** (Sotuv) — mahsulot nomi bir qatorga sig'sin,
      ikkiga tushib ketmasin.
- [x] **Katalog** — mahsulot nomi va narxi qator ichida kesilmasin.
- [x] **Tarix** — sotuv qatorlari qalashib qolmasin.
- [x] Kartalar chetlari bir xil yumaloqlikda ko'rinsin (ilgari 16 va 18
      aralash edi — yonma-yon turgan kartalarda sezilardi).
- [x] Nishonlar (`3/6`, qoldiq belgilari) to'liq **oval** bo'lsin, burchakli
      emas.

### 2.2 Header (barcha ekranlarda bir xil)

15 ta ekranda header qo'lda yozilgan edi va har birida biroz boshqacha.
Endi bittasi.

- [x] Quyidagi ekranlarni ochib chiqing — **orqaga tugmasi bir xil
      o'lchamda va sarlavha ko'k rangda** bo'lsin:
      Sozlamalar · Kassa yopish · Printer · Diagnostika · Statistika ·
      Kategoriyalar · Nasiya · Mijoz · Mijoz formasi · Xarajatlar ·
      Ta'minotchilar · Kirim · Import · Bildirishnomalar · Yuborilmagan sotuvlar
- [x] **O'ng tomonida tugmasi bor to'rttasi** alohida tekshirilsin —
      joyi siljib qolmaganini ko'ring:
      - Diagnostika → ulashish + tozalash
      - Xarajatlar → hafta/oy tanlagichi
      - Kirim → ta'minotchilar
      - Mijoz → tahrirlash
- [x] **Kirim** va **Import** ekranlarida ikkita header bor edi (yuklanish
      holati va asosiy ko'rinish) — ikkalasi ham bir xil chiqsin.

### 2.3 Bosilish javobi

- [x] **Sotuv → To'lash** tugmasi bosilganda biroz kichraysin
      (ilovadagi eng ko'p bosiladigan tugma).
- [x] Orqaga tugmasi bosilganda javob bersin.
- [x] **Nasiya / Xarajatlar / Ta'minotchilar** ro'yxat qatorlari bosilganda
      kichraysin.
- [x] Uchta FAB (+ tugmalari) bosilganda kichraysin.

### 2.4 Skeleton yuklanish

- [x] **Nasiya**, **Xarajatlar**, **Ta'minotchilar** — ochilganda aylanuvchi
      doira o'rniga kulrang qator o'rindiqlari ko'rinsin, ular sekin
      "nafas olsin".
- [x] Ma'lumot kelganda sahifa **sakramasin** (o'rindiq va haqiqiy qator
      taxminan bir balandlikda).

### 2.5 Harakatni kamaytirish (a11y)

Sozlamalarda animatsiyani o'chirib qo'ying, keyin:

- [x] Bosilganda **kichrayish bo'lmasin** (bosish o'zi ishlashda davom etsin).
- [x] Skeleton **pulsi to'xtasin** (kulrang qoladi, lekin qimirlamaydi).
- [x] Skanerdagi lazer chizig'i qimirlamasin.

### 2.6 Tungi rejim

- [x] Skeleton o'rindiqlari fonda ko'rinsin (juda och yoki juda to'q emas).
- [x] Karta chegaralari yo'qolmasin — Sprint 12 da 0.5px chegaralar 1px ga
      o'tkazildi, aynan shu tungi rejimda ba'zi qurilmada ko'rinmasdi.

---

## 3. Sprint 11 — yangi o'zgarishlar ✅ 2026-08-14 qurilmada tasdiqlandi

### 3.1 Raqamlar (tabular shrift)

Maqsad: raqam o'zgarganda **matn sakramasligi**, ustundagi narxlar tekis turishi.

- [x] **Sotuv** — savatga mahsulot qo'shib boring. Pastdagi **jami** summa
      har o'zgarganda chapga-o'ngga qimirlamasin.
- [x] **Sotuv** — savatda 3+ mahsulot bo'lsa, o'ngdagi qator summalari bir
      vertikal chiziqda tursin.
- [x] **Bosh sahifa** — tushum/foyda kartalari; raqamlar kesilmasin.
- [x] **Statistika** — top mahsulotlar va kassirlar ro'yxatidagi summalar.
- [x] **Nasiya** — mijozlar ro'yxatidagi balanslar ustuni.
- [x] **Kassa yopish** — "Kutilgan / Sanalgan / Farq" uchtasi bir xil
      kenglikda tursin (bu ekranda solishtirish eng muhim).
- [x] **Tarix** — sotuv summalari.

> Agar biror ekranda raqam **buzilgan yoki juda siqilgan** ko'rinsa — bu
> `fontVariant: ["tabular-nums"]` ni shrift qo'llab-quvvatlamayotgani bo'ladi;
> shu ekranni aytib qo'ying.

### 3.2 Harakatni kamaytirish (a11y)

- [x] Android: *Sozlamalar → Maxsus imkoniyatlar → Animatsiyalarni o'chirish*
      (yoki iOS: *Accessibility → Motion → Reduce Motion*) — YOQING.
- [x] Skanerni oching: lazer chizig'i **qimirlamasin**, ramka o'rtasida
      tursin. Skanerlashning o'zi ishlashda davom etsin.
- [x] Sozlamani o'chiring — chiziq yana tebransin.

### 3.3 Tipografika

- [x] Yuklanish matnlari `…` bilan tugasin (`...` uchta nuqta emas):
      "Yuklanmoqda…", "Saqlanmoqda…", "Kirilmoqda…".
- [x] Uch tilda ham tekshiring (Sozlamalar → Til).

### 3.4 Ekran o'quvchi (ixtiyoriy, lekin foydali)

- [x] TalkBack/VoiceOver yoqib, **Sotuv** ekranidagi "Tez-tez sotiladigan"
      plitkasini bosing — nom va narx **bitta tugma** bo'lib o'qilsin.

---

## 4. Sprint 10 regressiyasi ✅ 2026-08-14 qurilmada tasdiqlandi

Bu o'zgarishlar kod darajasida tuzatilgan edi, endi qurilmada ham tekshirildi.

### 4.1 BottomSheet uslublari (ildiz sabab tuzatilgan)

Har bir oyna ochilsin va **tugmalar to'liq balandlikda, fon bilan** chiqsin
(ilgari ~25px, fonsiz edi):

- [x] To'lov oynasi (Sotuv → To'lash) — **tanlangan to'lov usuli ko'rinsin**
      (ilgari oq matn + oq fon = ko'rinmasdi)
- [x] Vazn oynasi (vaznli mahsulot)
- [x] Tezkor narx oynasi
- [x] Mijoz tanlash · Ta'minotchi tanlash · Ta'minotchi formasi
- [x] Kategoriya oynasi · Xarajat formasi · Qaytarish oynasi
- [x] Do'kon almashtirish · Fikr bildirish · Kirimga mahsulot qo'shish

### 4.2 Savat kartasi

- [x] Bir ekranda 7-8 mahsulot ko'rinsin (ilgari 3-4).
- [x] **"+" tugmasining o'ng chetini bosing** — mahsulot tasodifan
      o'chib ketmasin (hitSlop ustma-ustligi tuzatilgan).
- [x] "Tez-tez sotiladigan" panel savat bo'sh emasligida yashirilsin.

### 4.3 To'lov oynasi mantiqi

- [x] Ekvayring **sozlanmagan** do'konda "QR to'lov" ko'rinmasin.
- [x] "Plastik" bilan sotuv → **Kassa yopish**da kutilgan naqd summasiga
      qo'shilmasin (soxta kamomad chiqmasin).

### 4.4 Bildirishnomalar markazi

- [x] Bosh sahifa header'idagi qo'ng'iroqcha + sanoq ko'rinsin.
- [x] Sanoq — muammo **turlari** soni (masalan "kam qoldiq" + "qarzdor" = 2),
      mahsulotlar yig'indisi emas.
- [x] Qarzdorlar ro'yxati ochilsin.
- [x] **Kunlik xulosa kartasi** — faqat do'kon **egasida** ko'rinsin,
      kassirda ko'rinmasin (kassirga xulosa hech qachon yuborilmaydi).

---

## 4b. AI yordamchi (1-bosqich) ✅ 2026-08-14 qurilmada tasdiqlandi

> Ko'proq → **AI yordamchi**. Faqat do'kon **egasida** ko'rinadi.

- [x] **Rozilik ekrani** birinchi ochilishda chiqsin, "Roziman" bosilgach
      boshqa chiqmasin (ilova qayta ochilganda ham).
- [x] **Kassir akkauntida** menyuda AI bandi umuman ko'rinmasin.
- [x] **Bosh ekran header'ida** ✨ ikonka (qo'ng'iroqcha yonida) egasida
      ko'rinsin, kassirda ko'rinmasin; bosilganda chat ochilsin.
- [x] **Taklif chiplari** bosilganda savol yuborilsin.
- [x] "Bugun qancha sotdik?" → javob **Bosh ekrandagi tushum** bilan mos kelsin.
- [x] "Nima tugab qolyapti?" → javob ostida **"Kam qoldiq" chipi** ko'rinsin va
      ro'yxat katalogdagi kam-qoldiq bilan mos kelsin.
- [x] Ketma-ket ikki savol: ikkinchisida AI birinchi savolni **eslasin**
      (masalan "Undan qanchasi qoldi?").
- [x] **Aviarejim** yoqilganda: ogohlantirish banneri chiqsin, yuborish
      tugmasi o'chsin.
- [x] Javob kelayotganda **"O'ylayapti…"** ko'rsatkichi chiqsin, kiritish
      maydoni bloklansin.
- [x] **Yangi suhbat** tugmasi (o'ngda) ro'yxatni tozalasin va AI oldingi
      savollarni unutsin.
- [x] Uzun javob **ekrandan chiqib ketmasin**, matn belgilanadigan bo'lsin.
- [x] Tungi rejimda puffaklar va chiplar o'qilsin.

**2-bosqich (oqim + baho):** ✅ 2026-08-14 qurilmada tasdiqlandi

- [x] Javob **so'zma-so'z chiqsin** (oqim) — bo'sh ekranda kutish bo'lmasin.
- [x] Tool chaqirilganda chip **javob kelishidan oldin** ko'rinsin.
- [x] Javob tugagach ostida **👍/👎** paydo bo'lsin; bosilganda belgilanib
      qolsin va ilova qayta ochilganda bazada saqlangan bo'lsin.
- [x] Oqim o'rtasida internetni uzsangiz — xato puffagi + "Qayta urinish"
      chiqsin, ilova qotib qolmasin.
- [x] 20+ xabarli uzun suhbatda javob sifati pasaymasin (eski qism xulosaga
      siqiladi — AI oldingi mavzuni umumiy holda eslashi kerak).

**3-bosqich (yangi tool'lar + kartalar):** ✅ 2026-08-14 qurilmada tasdiqlandi

- [x] "Coca-Cola haqida ma'lumot ber" → mahsulot kartasi (narx, qoldiq,
      shtrix-kod, kategoriya) to'g'ri chiqsin.
- [x] "Qaysi tovarlar qotib qolgan?" → sekin tovarlar ro'yxati.
- [x] "Omborda nima bor?" → mahsulotlar soni va chakana qiymat.
- [x] "Savdo o'symoqdami?" → kunlik dinamika bo'yicha izohli javob.
- [x] Mahsulot nomi so'ralganda javob ostida **bosiladigan karta** chiqsin;
      bosilganda o'sha mahsulot tahrirlash ekrani ochilsin.
- [x] Kartalar javob matnidan **oldin** ko'rinsin (model hali yozayotganda).
- [x] AI javobida **tan narx, foyda, mijoz yoki xodim ismi CHIQMASIN**
      (tekin tier cheklovi).

**4-bosqich (yozuv takliflari):** ✅ 2026-08-14 qurilmada tasdiqlandi

- [x] Sozlamalarga tegmasdan (default **yoqilgan**): "Coca-Cola narxini
      14 000 qil" → **tasdiq kartasi** chiqsin (eski → yangi qiymat ko'rinsin).
- [x] Sozlamalar → AI yordamchi → tugmani **o'chirib**: xuddi shu savol → AI
      imkoniyat yoqilmaganini aytsin, tasdiq kartasi CHIQMASIN.
- [x] **Bekor** bosilsa: mahsulot narxi O'ZGARMASIN, karta "Bekor qilindi"ga aylansin.
- [x] **Tasdiqlash** bosilsa: katalogda narx yangilanganini tekshiring.
- [x] "Qoldiqni 20 qil" → xuddi shu oqim qoldiq uchun ishlasin.
- [x] Nomi o'xshash bir nechta mahsulot bo'lsa → AI qaysi biri kerakligini
      **so'rasin**, taklif yozmasin.
- [x] AI javobida "o'zgartirdim/bajardim" **DEMASIN** — faqat "tasdiqlang".
- [x] Kassir akkauntida bu bo'lim Sozlamalarda umuman ko'rinmasin.

**5-bosqich (kunlik xulosa):** ✅ asosiy oqim 2026-08-14 qurilmada tasdiqlandi

- [x] Bosh ekranda **"Bugungi xulosa"** kartasi chiqsin (egasi, rozilik berilgan).
- [x] Xulosa matni haqiqiy raqamlarga mos kelsin (bugungi tushum, kam qoldiq).
- [x] Ilovani yopib qayta ochganda **qayta hisoblanmasin** (server keshi) —
      matn bir xil qolsin.
- [x] Karta bosilganda AI chat ochilsin.
- [x] **Rozilik berilmagan** holatda karta umuman chiqmasin (so'rov ham
      yuborilmasin).
- [x] Kassir akkauntida karta ko'rinmasin.
- [x] Internet yo'q bo'lsa karta jim yo'qolsin (xato banneri chiqmasin).

**5-bosqich (buyurtma maslahatchisi):** ✅ asosiy oqim 2026-08-14 qurilmada tasdiqlandi

- [x] "Nima buyurtma qilishim kerak?" → tovarlar **necha kunga yetishi**
      bilan javob bersin (kam qoldiq ro'yxatidan farqli).
- [x] Tez sotiladigan, lekin chegaradan yuqori turgan tovar ro'yxatga
      tushsin (masalan kuniga 20 dona ketadigan, 25 dona qolgan).
- [x] Kunlik xulosada "… N kunga yetadi" jumlasi paydo bo'lsin.
- [x] Javob ostidagi kartalar bosilganda mahsulot ekrani ochilsin.

**Chat tarixi:** ✅ 2026-08-14 qurilmada tasdiqlandi

- [x] AI chat header'ida soat ikonkasi → **Suhbatlar tarixi** ekrani ochilsin.
- [x] Ro'yxatda oldingi suhbatlar sarlavha + sana bilan ko'rinsin (eng
      yangisi tepada).
- [x] Qatorni bosish — o'sha suhbat matnlari va tool chiplari **tiklanib**
      ochilsin (yangi savol xuddi shu kontekstda davom etsin).
- [x] Eski suhbatdagi bosiladigan mahsulot kartalari **qayta chiqmasin** —
      bu kutilgan holat (kartalar DB'da saqlanmaydi), xato emas.
- [x] Agar eski suhbatda **hali tasdiqlanmagan** narx/qoldiq taklifi bo'lsa
      (tasdiqlamay chiqib ketilgan bo'lsa) — ro'yxat oxirida taklif kartasi
      qayta chiqsin, tasdiqlash/bekor qilish ishlasin.
- [x] O'chirish tugmasi → tasdiq so'rasin → o'chirilgach ro'yxatdan yo'qolsin.
- [x] Bo'sh ro'yxatda "Hali suhbat yo'q" holati chiqsin.

**Anomaliya alerti:** ✅ 2026-08-14 qurilmada tasdiqlandi (migration 039
Supabase'da bajarilgan)

- [x] Supabase'da `039_anomaly_alerts.sql` bajarilgan bo'lsin.
- [x] Tan narxdan past sotuv qilib ko'ring (masalan tezkor narx bilan) →
      Bildirishnomalar markazida "Zararli sotuvlar" chiqsin.
- [x] Bir kunda 3+ marta qaytarish qiling → "Qaytarish ko'paydi" chiqsin.
- [x] Kassa yopishda kutilgandan sezilarli kam naqd kiriting → "Kassa
      kamomadi" chiqsin.
- [x] Uchalasi ham **faqat egasida** ko'rinsin, kassir hisobida umuman
      chiqmasin (tan narx/foyda bilan bog'liq).
- [x] Muammo yo'q bo'lsa uchalasi ham ro'yxatda umuman ko'rinmasin.
- [x] Har biri bosilganda tegishli ekranga o'tsin (Statistika / Tarix /
      Kassa yopish).

---

## 4c. Ko'proq — "Kassirlar" bo'limi qayta tuzildi ✅ 2026-08-14 qurilmada
tasdiqlandi

Ilgari "Kassir hisoboti" Ko'proqda alohida tugma edi, xodim qo'shish va
ruxsat berish esa Sozlamalar ichida edi. Endi ikkalasi bitta joyda —
`staff.tsx`, faqat manzil rolga qarab farqlanadi.

- [x] **Egadan**: Ko'proq → "Kassirlar" → yangi ekran ochilsin, tepasida
      "Kassir hisoboti" qatori, pastda xodim qo'shish/ro'yxat/ruxsat bo'lsin.
- [x] Egadan "Kassir hisoboti" qatorini bosing → `/cashier-report` ochilsin.
- [x] Egadan yangi kassir qo'shing, ruxsat bering, o'chiring — hammasi
      avvalgidek ishlasin (mantiq o'zgarmagan, faqat joyi ko'chgan).
- [x] **Kassir hisobidan**: Ko'proq → "Kassirlar" → to'g'ridan-to'g'ri
      **o'z** `Kassir hisoboti`ga tushsin (xodim boshqaruvi ko'rinmasin).
- [x] Sozlamalar ekranida endi "Kassirlar" bo'limi umuman ko'rinmasin —
      faqat Ko'proqda.

---

## 5. Doimiy asosiy oqim (har sprintda) ✅ 2026-08-14 qurilmada tasdiqlandi

- [x] Kirish → do'kon tanlash
- [x] Skaner bilan sotuv → chek chiqarish
- [x] Internetsiz sotuv → internet qaytganda sinxronlanish
- [x] Mahsulot qo'shish/tahrirlash → katalogda ko'rinishi
- [x] Nasiya: qarz yozish → to'lov qabul qilish
- [x] Tungi rejim: barcha ekranlarda matn o'qilishi

---

## 6. Xato topilsa

Sozlamalar → **Diagnostika** ekranida oxirgi 50 ta xato jurnali bor —
skrinshot yoki matnini yuboring, bu ildiz sababni topishni tezlashtiradi.

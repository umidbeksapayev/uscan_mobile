# Qurilmada sinov ro'yxati

Har sprintdan keyin qurilmada bosib chiqiladigan ro'yxat. Maqsad — emulyator
yoki `tsc`/`jest` topa olmaydigan narsalarni ushlash: uslub yo'qolishi, bosish
maydonlari, kamera, printer, push.

## 0. Qaysi build kerak

| O'zgarish turi | Yetarli |
|---|---|
| Faqat JS/TSX, tarjima, uslub | `npm start` (dev build ulanadi) yoki OTA |
| Yangi native paket, `app.json`, `google-services.json` | **Yangi dev build** |

Sprint 11 o'zgarishlari **JS-only** — yangi build kerak emas.

```bash
npm start
```

> Metro keshi shubhali bo'lsa: `npx expo start --clear`.

---

## 1. Sprint 11 — yangi o'zgarishlar

### 1.1 Raqamlar (tabular shrift)

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

### 1.2 Harakatni kamaytirish (a11y)

- [ ] Android: *Sozlamalar → Maxsus imkoniyatlar → Animatsiyalarni o'chirish*
      (yoki iOS: *Accessibility → Motion → Reduce Motion*) — YOQING.
- [ ] Skanerni oching: lazer chizig'i **qimirlamasin**, ramka o'rtasida
      tursin. Skanerlashning o'zi ishlashda davom etsin.
- [ ] Sozlamani o'chiring — chiziq yana tebransin.

### 1.3 Tipografika

- [ ] Yuklanish matnlari `…` bilan tugasin (`...` uchta nuqta emas):
      "Yuklanmoqda…", "Saqlanmoqda…", "Kirilmoqda…".
- [ ] Uch tilda ham tekshiring (Sozlamalar → Til).

### 1.4 Ekran o'quvchi (ixtiyoriy, lekin foydali)

- [ ] TalkBack/VoiceOver yoqib, **Sotuv** ekranidagi "Tez-tez sotiladigan"
      plitkasini bosing — nom va narx **bitta tugma** bo'lib o'qilsin.

---

## 2. Sprint 10 regressiyasi (hali qurilmada tasdiqlanmagan)

Bu o'zgarishlar kod darajasida tuzatilgan, ammo qurilmada ko'rilmagan.

### 2.1 BottomSheet uslublari (ildiz sabab tuzatilgan)

Har bir oyna ochilsin va **tugmalar to'liq balandlikda, fon bilan** chiqsin
(ilgari ~25px, fonsiz edi):

- [ ] To'lov oynasi (Sotuv → To'lash) — **tanlangan to'lov usuli ko'rinsin**
      (ilgari oq matn + oq fon = ko'rinmasdi)
- [ ] Vazn oynasi (vaznli mahsulot)
- [ ] Tezkor narx oynasi
- [ ] Mijoz tanlash · Ta'minotchi tanlash · Ta'minotchi formasi
- [ ] Kategoriya oynasi · Xarajat formasi · Qaytarish oynasi
- [ ] Do'kon almashtirish · Fikr bildirish · Kirimga mahsulot qo'shish

### 2.2 Savat kartasi

- [ ] Bir ekranda 7-8 mahsulot ko'rinsin (ilgari 3-4).
- [ ] **"+" tugmasining o'ng chetini bosing** — mahsulot tasodifan
      o'chib ketmasin (hitSlop ustma-ustligi tuzatilgan).
- [ ] "Tez-tez sotiladigan" panel savat bo'sh emasligida yashirilsin.

### 2.3 To'lov oynasi mantiqi

- [ ] Ekvayring **sozlanmagan** do'konda "QR to'lov" ko'rinmasin.
- [ ] "Plastik" bilan sotuv → **Kassa yopish**da kutilgan naqd summasiga
      qo'shilmasin (soxta kamomad chiqmasin).

### 2.4 Bildirishnomalar markazi

- [ ] Bosh sahifa header'idagi qo'ng'iroqcha + sanoq ko'rinsin.
- [ ] Sanoq — muammo **turlari** soni (masalan "kam qoldiq" + "qarzdor" = 2),
      mahsulotlar yig'indisi emas.
- [ ] Qarzdorlar ro'yxati ochilsin.
- [ ] **Kunlik xulosa kartasi** — faqat do'kon **egasida** ko'rinsin,
      kassirda ko'rinmasin (kassirga xulosa hech qachon yuborilmaydi).

---

## 3. Doimiy asosiy oqim (har sprintda)

- [ ] Kirish → do'kon tanlash
- [ ] Skaner bilan sotuv → chek chiqarish
- [ ] Internetsiz sotuv → internet qaytganda sinxronlanish
- [ ] Mahsulot qo'shish/tahrirlash → katalogda ko'rinishi
- [ ] Nasiya: qarz yozish → to'lov qabul qilish
- [ ] Tungi rejim: barcha ekranlarda matn o'qilishi

---

## 4. Xato topilsa

Sozlamalar → **Diagnostika** ekranida oxirgi 50 ta xato jurnali bor —
skrinshot yoki matnini yuboring, bu ildiz sababni topishni tezlashtiradi.

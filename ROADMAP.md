# uscan mobile — Roadmap va Holat

**uscan** — kichik do'kon egalari uchun barcode-skanerli POS (Point of Sale) tizimi.
Bu repo — uscan'ning **native mobil ilovasi** (React Native + Expo). Web/Capacitor
versiyasi alohida loyihada; ikkalasi ham **bir xil Supabase backend**ga ulanadi.

> Native ilova backendni qayta qurmaydi — u mavjud Supabase (Auth + PostgreSQL +
> Storage, 29+ migratsiya, RPC, RLS) ustiga **yangi client**. Eski web + Capacitor
> APK parity ga yetguncha ishlab turaveradi.

---

## Texnik Stack

| Qatlam | Texnologiya |
|--------|------------|
| Framework | React Native + **Expo (managed)** + **Expo Router** (file-based) |
| Til | TypeScript |
| UI | **NativeWind** (Tailwind for RN) — web tokenlarini reuse |
| State | **Zustand** (savat) + **TanStack Query** (server state) |
| Backend | **supabase-js** (web bilan bir xil DB) |
| Barcode | **expo-camera** (ML Kit) → F10'da vision-camera'ga ko'chiriladi |
| Forms | TextInput + sof funksiyalar (zod keyin) |
| Grafik | **react-native-svg** (Expo Go mos) |
| Offline | expo-sqlite + react-native-mmkv (F9) |
| Print | expo-print / ESC-POS Bluetooth (F10, dev build) |
| Build | **EAS Build** (bulut) + OTA (F11) |
| Test | jest-expo + RNTL · CI: tsc + jest |
| Brend | Ko'k — `#0F3D6E` / `#2F80ED` / `#7DB4F5` / oq |

---

## Asosiy qoidalar

- **DONALI (`unit`)** vs **VAZN (`weight`)** — ikki sotuv turi. VAZN: kg, 3 kasr;
  mijoz "20 000 so'mlik shakar" desa → kg avto hisoblanadi (weight-sheet).
- Pul DB'da **DECIMAL so'm** (tiyin EMAS). Savat/refund summasi client'da **tiyinda
  yaxlitlanadi** (float drift yo'q).
- **`cost_price` (tan narxi) HECH QACHON** kassir ekraniga chiqarilmaydi (maxfiy).
- **RLS** har bir foydalanuvchini o'z `shop_id` bilan cheklaydi; faol-do'kon
  switcher + 2 rol (`owner` / `cashier`).
- Sotuv `process_sale_cart` RPC orqali (atomar, inventar↓, `client_id`
  idempotentlik). Qaytarish `process_return` RPC orqali (atomar, inventar tiklanadi).

---

## ✅ Bajarilgan ishlar (F0–F5 + qo'shimcha)

### F0 — Poydevor
- Expo SDK 54, Expo Router, NativeWind + brend tokenlar (`tailwind.config.js`)
- `supabase.ts` (AsyncStorage, `processLock`, AppState auto-refresh)
- `lib/format` (so'm/kg formatlash), TanStack Query provider
- 5-tab navigatsiya: **Bosh · Mahsulotlar · Sotuv · Tarix · Ko'proq** (floating nav)
- Kod bilan chizilgan uscan logo *(⚠️ keyin PNG/SVG bilan almashtiriladi)*

### F1 — Auth + faol do'kon
- Email + parol (signIn / signUp), `AuthProvider` + `AuthGate` (sessiya routing)
- O'zbekcha auth-xatolar, `useMemberships` (do'kon + rol + ruxsat)
- "Ko'proq" = profil + email + rol + Chiqish

### F2 — Katalog + qidiruv
- Mahsulotlar ro'yxati (RLS), `ilike` qidiruv (debounce), kategoriya chiplari
- ProductRow (rasm/ikona + DONALI/VAZN chip + narx + qoldiq badge), `cost_price` yashirin
- loading / empty / error + pull-refresh; Stitch dizaynda qayta qurildi (skaner + filter + FAB)

### F3 — Sotuv + Skaner
- `expo-camera` skaner (barcode variantlar lookup → savatga qo'shadi)
- `cart-store` (Zustand): DONALI stepper / VAZN kg; `cart-total` (tiyin yaxlitlash)
- **VAZN tezkor oyna** (so'm ⇄ kg avto hisob, ikki tomonlama)

### F4 — Checkout = **MVP yakuni**
- `payment-sheet`: Jami to'lov + Naqd/Karta/QR/Nasiya + naqd qaytim
- `process_sale_cart` RPC (atomar, idempotent `client_id` = UUID) → success ekran
- Login ildiz-fix: supabase-js RN auth race (`processLock` + AppState)

### Qo'shimcha — Mahsulot qo'shish / tahrir
- `product-form`: nom, shtrix-kod (+skaner), kategoriya, DONALI/VAZN, sotuv/tan narx, miqdor
- Kam-qoldiq AVTO 20%; jonli foyda% ko'rsatkich; sticky tugma; klaviatura auto-scroll
- **Rasm yuklash** (kamera/galereya → Supabase `product-images` bucket, 1:1 siqish)
- To'liq loop telefonda: **qo'shish → sotish → to'lov**

### F5 — Tarix + Qaytarish *(eng so'nggi)*
- **Tarix ekrani**: sotuvlar ro'yxati, bosib ochiladigan kartalar (mahsulotlar),
  "Qaytarilgan" badge, pull-refresh, empty/error
- **ReturnSheet** (bottom-sheet): VAZN/DONALI moslashuvchan qaytarish miqdori +
  "Hammasi" + sabab + jonli refund preview
- `features/history`: `history-api` (getSalesHistory / getReturnedQuantities /
  processReturn) + `use-history` (TanStack Query) + `returnable` (sof funksiyalar)
- **Qaytarish faqat egasiga** (role gating — `returns` RLS egasi-only)
- Backend: migration 014 allaqachon shared DB'da (yangi migratsiya yo'q)

**Test holati:** 34 unit test (format, auth-errors, barcode, cart-total, payment-math,
weight-math, low-stock, uuid, returnable). CI: har push'da `tsc` + `jest`.

---

## ⏳ Keyingi ishlar (F6–F11)

### F6 — Dashboard + Hisobot *(reja tayyor)*
- "Bosh" ekranini qayta qurish (hozir Faza-0 placeholder)
- **Bugun** stat kartalari: tushum · foyda · sotuv soni · kam qoldiq
- Davr toggle (7 / 30 kun) + **trend grafigi** (react-native-svg)
- **Eng ko'p sotilgan** + **Kam sotilyapti** + **Kam qoldiq** ro'yxatlari
- RPC'lar shared DB'da bor: `get_dashboard_stats`, `get_sales_trend`,
  `get_top_products`, `get_slow_products` (yangi migratsiya yo'q)

### F7 — Nasiya (qarz daftari) + Kirim
- Mijozlar + nasiya qoldig'i, qarz to'lash (migration 013/025/026)
- Checkout'dagi "Nasiya" to'lovni mijozga bog'lash
- Kirim / ta'minotchi (migration 015)

### F8 — Kategoriya + Sozlama + RBAC + "Ko'proq"
- Kategoriya CRUD (migration 018)
- Sozlamalar ekrani, do'kon almashtirish, kassir rollari/ruxsatlari (016/017)
- "Ko'proq" menyusini to'ldirish

### F9 — Offline-first ✅
- `expo-sqlite` (navbat + cache) + `react-native-mmkv` + `@react-native-community/netinfo`
- Internetsiz katalog + sotuv navbati, reconnect sync (idempotent `client_id` = 019)
- ⚠️ Native modullar → yangi EAS dev build kerak. DB migration YO'Q.

### F10 — Print + QR to'lov ✅ *(dev build kerak)*
- ✅ Chek printi — **expo-print** 58mm HTML chek (tizim print dialogi); sotuv success + (keyin) tarixdan qayta chek. ESC-POS Bluetooth = keyingi faza.
- ✅ QR/ekvayring to'lov (029) — web API mirror (`createPaymentIntent`/`getIntentStatus`/`markIntentFinalized`) + QR oyna + polling + idempotent yakunlash; **progressive** (`acquiringHasCredentials` bo'lsa yoqiladi). ⚠️ Payme sandbox kutadi.
- ✅ Skaner → **react-native-vision-camera** (alohida PR'da TUGADI)
- ✅ `expo-dev-client` custom build

### F11 — Release
- **EAS Build** (bulut APK/AAB) + OTA yangilanishlar
- App icon / splash, Play Store listing, staged rollout
- E2E (Maestro) relizdan oldin

---

## 📌 Ochiq TODO / eslatmalar

- ⚠️ **Logo** — kod bilan chizilgan; foydalanuvchi PNG/SVG bilan almashtirmoqchi
- ⚠️ **Skaner** hozir expo-camera (Expo Go) — F10'da vision-camera'ga ko'chiriladi
- ⚠️ **Native splash** phase 2 ochiq
- ⚠️ Yangi paket qo'shilganda Expo Go'da `expo start -c` (Metro resolve) shart
- ℹ️ `appId` qarori: `uz.shopscan.app` vs `uz.uscan.app` — relizда yakunlanadi

---

## Ishga tushirish

```bash
npm install
cp .env.example .env      # Supabase URL + anon key kiriting
npx expo start -c         # Expo Go (SDK 54) bilan oching
npm test                  # unit testlar
```

> Migratsiyalar (`supabase/migrations/`) shared Supabase DB'da QO'LDA, raqam
> tartibida ishga tushiriladi (web loyihasidagi `supabase/` papkasi).

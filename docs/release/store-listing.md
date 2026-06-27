# uscan — Do'kon listing & reliz runbook (F11)

Bu fayl Play Console / App Store Connect uchun matn qoralamalari va reliz qadamlari.

---

## 1. Listing matni (UZ)

- **Ilova nomi:** `uscan` _(band bo'lsa: `uscan — Do'kon POS`)_
- **Qisqa tavsif (≤80 belgi):**
  `Do'kon uchun barcode-skanerli POS — sotuv, katalog, nasiya, hisobot, offline.`
- **To'liq tavsif:**

```
uscan — kichik do'konlar uchun zamonaviy savdo (POS) tizimi.

• Barcode skaner orqali tez sotuv (dona va kg/vazn)
• Mahsulot katalogi, kategoriyalar, Excel/CSV import
• Sotuv tarixi va qaytarish
• Nasiya (qarz) daftari va kirim/ta'minotchi hisobi
• Dashboard va hisobotlar (tushum, foyda, kam qoldiq)
• Ko'p kassir + rollar/ruxsatlar
• Internetsiz ishlash (offline) — ulanганда avtomatik sinxronlash
• Chek printi (Bluetooth termal 58mm yoki PDF)
• QR/ekvayring to'lov (ixtiyoriy)

Ma'lumotlar xavfsiz Supabase serverlarida, har do'kon alohida izolyatsiya qilinadi.
```

- **Kategoriya:** Biznes (Business) / Mahsuldorlik (Productivity)
- **Content rating:** 3+ / Everyone — zo'ravonlik, qimor, kattalar kontenti **yo'q**.

---

## 2. Data Safety (Android) / App Privacy (iOS) — anketa javoblari

| Ma'lumot turi | Yig'iladimi? | Maqsad | Eslatma |
|---|---|---|---|
| Email manzili | ✅ Ha | Hisob/autentifikatsiya | Account-required |
| Sotuv/katalog ma'lumoti | ✅ Ha | Ilova faoliyati | Foydalanuvchi kiritadi |
| Joylashuv | ❌ Yo'q | — | — |
| Kontaktlar / SMS / Qo'ng'iroq | ❌ Yo'q | — | — |
| **Mikrofon / Audio** | ❌ Yo'q | — | RECORD_AUDIO olib tashlangan |
| Kamera (rasm/skaner) | Ruxsat bilan | Barcode + mahsulot rasmi | Saqlanmaydi (faqat ishlov) |
| Tahlil / Reklama SDK | ❌ Yo'q | — | Hech qanday tracker yo'q |

- **Shifrlash:** barcha trafik **HTTPS** (Supabase). 
- **Ma'lumotni o'chirish:** foydalanuvchi email orqali so'raydi → maxfiylik siyosatida ko'rsatilgan.
- **3-tomon:** faqat Supabase (backend).

---

## 3. Skrinshotlar (siz qurilmada olasiz)

Play: min 2, tavsiya 4–8. App Store: 6.5" + 5.5" iPhone uchun.
**Tavsiya etilgan ekranlar (dev build'da oching → screenshot):**
1. **Sotuv** ekrani (savat + skaner tugmasi)
2. **Katalog** (mahsulotlar ro'yxati + kategoriya chiplari)
3. **Dashboard / Bosh** (tushum/foyda kartalari)
4. **To'lov** oynasi (success + Chek tugmasi)
5. **Tarix** (sotuvlar)
6. **Nasiya** daftari
7. (ixtiyoriy) **Sozlama → Printer**

> Maxfiylik: skrinshotlarда haqiqiy mijoz ismi/raqami bo'lmasin (test ma'lumot).
- **Feature graphic (Android):** 1024×500 PNG — brend ko'k (#0F3D6E) fonда "uscan" logo.

---

## 4. Reliz qadamlari

### Siz (akkaunt + bir martalik)
1. **Google Play Console** ($25) + **Apple Developer** ($99/yil) akkauntlar.
2. **Production env** (build'dan OLDIN — eng kritik):
   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://...supabase.co"
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..."
   eas env:create --environment production --name EXPO_PUBLIC_WEB_URL --value "https://your-domain.com"
   eas env:list --environment production   # 3 ta, Visibility: Plain text bo'lsin
   ```
3. **Maxfiylik siyosati**ni web domeningizda joylashtiring (`docs/release/privacy-policy.md`).

### Build (men buyruq beraman)
```bash
eas build --profile production --platform android   # → AAB
eas build --profile production --platform ios        # → IPA (Apple kredensial so'raydi)
```

### Yuklash (siz, qo'lda)
- **Android:** AAB → Play Console → Ilova yarating → Production → versiya → AAB yuklash.
- **iOS:** `eas submit -p ios --latest` (tavsiya) yoki `.ipa` ni Transporter bilan → App Store Connect.

### Listing + review
- Listing matni (1) + Data Safety (2) + skrinshot (3) + maxfiylik URL → to'ldiring.
- Review: Play ~1–3 kun, App Store ~24–48 soat.

### OTA (relizdan keyin JS tuzatish)
```bash
eas update --branch production --message "..."   # do'kon review'siz darhol
```

---

## 5. ⚠️ Cheklovlar
- **iOS Bluetooth termal printer ishlamaydi** (Apple MFi cheklovi) — iOS'da chek faqat AirPrint/PDF. Android'da to'liq BT.
- **Native o'zgarish** (yangi modul/plugin/permission) → yangi build + store yuklash. OTA faqat JS.
- `appVersionSource: "remote"` → versionCode'ni EAS/Play boshqaradi (qo'lda o'zgartirmang).

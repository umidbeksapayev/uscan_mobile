# E2E testlar (Maestro)

uscan_mobile kritik oqimlari uchun [Maestro](https://maestro.mobile.dev) E2E flow'lari.
Flow'lar haqiqiy build'ga (EAS dev/preview APK yoki simulyator build) qarshi ishlaydi —
Expo Go EMAS (native modullar: vision-camera, mmkv, sqlite). Real Supabase'ga ulanadi.

## Flow'lar

| Fayl | Nima tekshiradi | Hisob kerakmi |
|------|-----------------|---------------|
| `00-smoke.yaml` | Ilova ishga tushadi, login ekrani chiqadi | Yo'q |
| `01-login.yaml` | Email/parol → dashboard (auth + Supabase ulanish) | Ha |
| `02-sell-checkout.yaml` | Login → mahsulot → savat → naqd to'lov → muvaffaqiyat | Ha + mahsulot |

`config.yaml` flow tartibini belgilaydi (`maestro test .maestro/`).

## O'rnatish

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
# yoki: brew install maestro  (mac)
maestro --version
```

Qurilma/emulyator ulangan va **app o'rnatilgan** bo'lishi kerak:

```bash
# Dev build APK (bir marta) — keyin qurilmaga o'rnating
eas build -p android --profile development
adb install <apk>
```

## Ishga tushirish

```bash
# Duda (hisobsiz)
maestro test .maestro/00-smoke.yaml

# Login
maestro test \
  -e MAESTRO_EMAIL="test@misol.uz" \
  -e MAESTRO_PASSWORD="******" \
  .maestro/01-login.yaml

# To'liq kritik yo'l (DONALI, qoldig'i bor mahsulot nomi bilan)
maestro test \
  -e MAESTRO_EMAIL="test@misol.uz" \
  -e MAESTRO_PASSWORD="******" \
  -e MAESTRO_PRODUCT="Coca Cola" \
  .maestro/02-sell-checkout.yaml

# Hammasi (config.yaml tartibida)
maestro test \
  -e MAESTRO_EMAIL="test@misol.uz" \
  -e MAESTRO_PASSWORD="******" \
  -e MAESTRO_PRODUCT="Coca Cola" \
  .maestro
```

## Eslatmalar

- **Hisob ma'lumotlari hech qachon commit qilinmaydi** — faqat `-e` orqali (yoki Maestro Cloud secrets).
- `02-sell-checkout` uchun mahsulot **DONALI (dona)** va qoldig'i > 0 bo'lsin; nom yagona moslik bersin (VAZN mahsulot og'irlik oynasini ochadi — bu oqimga mos emas, sotuv DB inventarini kamaytiradi).
- Selektorlar: `testID` (`login-email`, `login-password`, `login-submit`, `sell-search`, `sell-result-first`) + barqaror o'zbekcha matnlar.
- CI'da hozircha yurmaydi (emulyator + dev build kerak; loyiha CI = tsc + jest). Lokal yoki Maestro Cloud'da yuriting.

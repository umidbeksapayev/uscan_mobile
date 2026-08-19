# 58mm + 80mm termal printer qo'llab-quvvatlash — dizayn (v2)

**Sana:** 2026-08-19
**Holat:** Tasdiqlangan, implementatsiyaga tayyor
**Eslatma:** Bu spec v1 (`paperWidth: 32 | 48`, chars-based)ni almashtiradi —
foydalanuvchi domen modelini `58 | 80` (mm) ga o'zgartirishni so'radi.

## Muammo

Chek chop etish hozir faqat 58mm uchun mo'ljallangan. 80mm termal printerlar
ham keng tarqalgan — ular ham to'liq qo'llab-quvvatlanishi kerak, eski
58mm konfiguratsiya buzilmasdan.

## Qamrov

- **Kiradi:** 58mm va 80mm, ikkalasi ham chek chop etishda (ESC-POS va
  PDF/HTML), sozlama UI, i18n (3 til), legacy MMKV moslik, testlar,
  printer-compatibility hujjat joyi.
- **Kirmaydi:** 57mm/76mm/100mm/A4, printer modelini avtomatik aniqlash,
  paper-width auto-detection, printer capability discovery/registry,
  DB/Supabase'ga chiqarish, yorliq (`encodeLabel`/`buildLabelsHtml`).

## Arxitektura printsipi

`paperWidth` ulanish turidan (Bluetooth / Tizim printeri) MUSTAQIL —
`Bluetooth + 58mm`, `Bluetooth + 80mm`, `Tizim printeri + 58mm`,
`Tizim printeri + 80mm` — barchasi valid. Sozlama UI'da Bluetooth
paneli ICHIDA emas, alohida bo'lim sifatida ko'rinadi.

## Domen modeli

`PrinterConfig.paperWidth: 58 | 80` (mm — domen darajasi). ESC-POS'dagi
"32/48 belgi" **implementation detail** — faqat `escpos-encoder.ts` ichida,
bitta joyda:

```ts
export function getCharsPerLine(paperWidth: 58 | 80): 32 | 48 {
  return paperWidth === 80 ? 48 : 32;
}
```

`EncodeOptions.width: number` → `EncodeOptions.paperWidth: 58 | 80` ga
NOMI O'ZGARADI (rename) — bu buzilish emas, chunki hozircha `encodeReceipt`ni
`width` bilan chaqiradigan birorta call site yo'q (faqat `padLine`/`divider`
to'g'ridan-to'g'ri `width: number`ni qabul qiladi va O'ZGARMAYDI — ular
ESC-POS'ning ichki, chars-based qatlami). Rename bitta commit'da barcha
call site va testlar bilan birga qilinadi.

## O'zgarishlar (fayl bo'yicha)

### `printer-settings.ts`
- `PrinterConfig.paperWidth: 58 | 80`, default `58`.
- `setPaperWidth(width: 58 | 80)` — `setCodepage` naqshiga mos.
- `setSystem`/`setBluetooth` `paperWidth`ni saqlab qoladi (`codepage` kabi).
- **Legacy moslik**: `load()` allaqachon `{ ...DEFAULT, ...parsed }` qiladi
  — eski saqlangan JSON'da `paperWidth` yo'q bo'lsa, spread orqali
  `DEFAULT.paperWidth` (58) ishlatiladi, **hech narsa qayta yozilmaydi**
  (`load()` `save()` chaqirmaydi). Bu xatti-harakat allaqachon to'g'ri —
  faqat test bilan qulflanadi.

### `escpos-encoder.ts`
- `getCharsPerLine()` helper qo'shiladi (yagona 58/80→32/48 xaritasi).
- `EncodeOptions.width` → `EncodeOptions.paperWidth: 58 | 80` (rename).
- `encodeReceipt()` ichida `getCharsPerLine(opts.paperWidth ?? 58)` bilan
  chars hisoblanadi, keyin `padLine`/`divider`ga xuddi avvalgidek uzatiladi
  (ular o'zgarmaydi — dynamic char-width qobiliyati saqlanadi).
- `encodeLabel()` tegilmaydi.

### `receipt-template.ts`
- `buildReceiptHtml(data, paperWidth: 58 | 80 = 58)`.
- CSS `width`: 58→"58mm", 80→"80mm".
- `truncateName(s, maxLen)`: 58→20, 80→32 (chaqiruvchida hisoblanadi).
- **CSS'ning qolgan qismi O'ZGARMAYDI** — asoslanish: `table{width:100%}`,
  `.amt{white-space:nowrap}`, `.nm{word-break:break-word}` allaqachon
  **nisbiy** (foizli/nowrap), piksel-qattiq EMAS — konteyner kengligi
  o'zgarganda o'zi qayta joylashadi, "58mm layoutga siqilib qolish" xavfi
  yo'q. Font-size/padding o'zgartirish qo'shimcha risk kiritadi, foyda
  bermaydi — shuning uchun QILINMAYDI (eng kichik xavfsiz o'zgarish
  printsipi). Test bilan tasdiqlanadi: 80mm HTML'da `nowrap`/`break-word`
  qoidalari yo'qolmagani va uzunroq nom kesilmasligi tekshiriladi.

### `documents.ts`
`receiptDocument()`:
```ts
escpos: () => {
  const cfg = getPrinterConfig();
  return encodeReceipt(data, { codepage: cfg.codepage, paperWidth: cfg.paperWidth });
},
html: () => buildReceiptHtml(data, getPrinterConfig().paperWidth),
```
`labelsDocument()` tegilmaydi.

### `printer-settings.tsx` (UI)
Yangi bo'lim "Qog'oz kengligi" — "Printer turi"dan keyin, `btPanelOpen`
shartidan TASHQARIDA (ikkala ulanish turiga ham tegishli). Matn:
- 58mm — "Standart termal printer"
- 80mm — "Keng termal printer"

("Katta chek" kabi noaniq ifoda ISHLATILMAYDI — foydalanuvchi buni aniq
so'radi, chunki bu narx emas, qog'oz eni haqida.)

### i18n (3 til)
`printer.widthHeader/width58/width58Sub/width80/width80Sub`. `58mm`/`80mm`
tarjima qilinmaydi. `btTitle`dagi qattiq yozilgan "(58mm)" olib tashlanadi
(3 faylda) — chunki endi Bluetooth kenglikdan mustaqil.

### Printer compatibility hujjat
`docs/PRINTER_COMPATIBILITY.md` — jadval **BO'SH** yaratiladi (ustunlar:
Model / Ulanish / Kenglik / Holat), izoh bilan: faqat qurilmada haqiqiy
sinovdan o'tgan modellar qo'shiladi, o'ylab topilgan qator YO'Q.

## Test strategiyasi

⚠️ **Texnik cheklov aniqlandi**: `printer-settings.ts` `@/lib/offline/mmkv`
import qiladi (`react-native-mmkv`), loyihada bu modul uchun jest mock
YO'Q (`jest.config.js` faqat `jest-expo` preset). Shuning uchun yangi
`printer-settings.test.ts` va `documents.test.ts` fayllarida
`jest.mock("@/lib/offline/mmkv", ...)` bilan xotiradagi soxta `storage`
beriladi (`Map` asosida, faqat `getString`/`set` — `printer-settings.ts`
shu ikkitasidan boshqasini ishlatmaydi).

- **A. Birlik (escpos-encoder):** `getCharsPerLine(58)===32`,
  `getCharsPerLine(80)===48`; `padLine`/`divider` ikkala kenglikda.
- **B. To'liq oqim (documents.test.ts, YANGI fayl):** haqiqiy
  `usePrinterStore.getState().setPaperWidth(80)` chaqirilib,
  `receiptDocument(data).escpos()` va `.html()` natijasi tekshiriladi —
  faqat helper emas, config→store→document→encoder butun zanjiri.
- **C. HTML (receipt-template):** 58/80 CSS, uzun nom kesilmasligi (80),
  kesilishi (58), `nowrap`/`break-word` qoidalari yo'qolmagani.
- **D. Legacy moslik (printer-settings.test.ts, YANGI fayl):**
  `paperWidth`siz eski JSON → effektiv qiymat 58, boshqa maydonlar
  saqlanadi, storage QAYTA YOZILMAYDI (mock orqali tekshiriladi).
- **E. 58mm regressiya:** barcha yuqoridagilar default/58 holatida ham
  ishlashi — alohida "regressiya" nomi bilan emas, mavjud testlar +
  yangilarining default-holat filiallari orqali qoplanadi.

Yorliq (`encodeLabel`/`buildLabelsHtml`) — o'zgarmaydi, test qo'shilmaydi.

## Orqaga moslik

Default `58` — eski build/foydalanuvchiga ta'sir yo'q, yangi build/
migratsiya shart emas (faqat JS/TSX).

## Qurilmada sinov

Haqiqiy 80mm printer kelgach: `docs/QURILMADA_SINOV.md` 7-bo'limiga
80mm qatorlari qo'shiladi (implementatsiyadan keyin, alohida commit).
Hardware test qilinmagan narsa hech qayerda "tested" deb yozilmaydi.

# 58mm + 80mm termal printer qo'llab-quvvatlash — implementatsiya rejasi (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chek chop etish (ESC-POS va Tizim printeri/PDF) 58mm bilan bir qatorda 80mm qog'ozni ham qo'llab-quvvatlasin; `paperWidth: 58 | 80` domen darajasida saqlanadi, ESC-POS'dagi 32/48-belgi bitta joyda (`getCharsPerLine`) implementation detail sifatida qoladi.

**Architecture:** `PrinterConfig.paperWidth: 58 | 80` (MMKV, lokal). Yagona ulash nuqtasi `documents.ts`dagi `receiptDocument()`. `escpos-encoder.ts`da `EncodeOptions.width` → `paperWidth: 58 | 80`ga nomi o'zgaradi (rename — hozircha bu bilan chaqiradigan call site yo'q, xavfsiz), ichkarida `getCharsPerLine()` orqali charsga aylanadi. `padLine`/`divider` chars-based, o'zgarmaydi. Ulanish turi (Bluetooth/Tizim) va qog'oz kengligi **mustaqil** o'zgaruvchilar.

**Tech Stack:** React Native (Expo), TypeScript, Zustand + MMKV, Jest.

## Global Constraints

- Domen modeli: `paperWidth: 58 | 80` (mm). Chars (`32 | 48`) FAQAT `escpos-encoder.ts` ichida, `getCharsPerLine()` orqali — boshqa joyda takrorlanmaydi.
- Yorliq (`encodeLabel`/`buildLabelsHtml`/`labelsDocument`) — **o'zgarmaydi**.
- Faqat 58/80mm — boshqa o'lcham, avtomatik aniqlash, capability registry, DB/Supabase o'zgarishi — **qamrovdan tashqari**.
- Default `58` — eski konfiguratsiyaga ta'sir yo'q, yangi build/migratsiya shart emas.
- `paperWidth` Bluetooth/Tizim printeridan MUSTAQIL — UI'da `btPanelOpen` sharti ichida joylashtirilmaydi.
- ⚠️ `printer-settings.ts` (`@/lib/offline/mmkv` → `react-native-mmkv`) uchun loyihada jest mock YO'Q. Yangi test fayllari (`printer-settings.test.ts`, `documents.test.ts`) `jest.mock("@/lib/offline/mmkv", ...)` bilan xotiradagi soxta `storage`ni o'zi ta'minlaydi (quyida Task 3/4da to'liq kod berilgan).
- Uch tilda (`uz-Latn`, `uz-Cyrl`, `ru`) barcha yangi matn.
- Real hardware sinovi (`docs/QURILMADA_SINOV.md`) implementatsiyadan KEYIN, alohida — kodda "tested" deb yozilmaydi.

---

### Task 1: `escpos-encoder.ts` — `getCharsPerLine` + `paperWidth` (TDD)

**Files:**
- Modify: `src/features/print/escpos-encoder.ts`
- Test: `src/features/print/__tests__/escpos-encoder.test.ts`

**Interfaces:**
- Consumes: hech narsa.
- Produces: `getCharsPerLine(paperWidth: 58 | 80): 32 | 48`, `EncodeOptions.paperWidth?: 58 | 80` (endi `width` YO'Q). Task 4 (`documents.ts`) shu ikkalasini ishlatadi.

- [ ] **Step 1: Failing testlarni yozish**

`escpos-encoder.test.ts`ning importiga `getCharsPerLine` qo'shiladi (`:1`):

```ts
import { sanitize, padLine, encodeReceipt, encodeLabel, getCharsPerLine } from "../escpos-encoder";
```

Yangi `describe` bloki, `describe("padLine", ...)` dan OLDIN qo'shiladi (`:37`dan oldin):

```ts
describe("getCharsPerLine", () => {
  it("58mm → 32 belgi", () => {
    expect(getCharsPerLine(58)).toBe(32);
  });
  it("80mm → 48 belgi", () => {
    expect(getCharsPerLine(80)).toBe(48);
  });
});
```

`describe("padLine", ...)` blokiga (mavjud 3 ta `it`dan keyin, yopilish qavsidan oldin, `:50` atrofida):

```ts
  it("80mm (48 belgi) uchun ham to'g'ri ishlaydi", () => {
    const l = padLine("Kartoshka", "12 000", 48);
    expect(l).toHaveLength(48);
    expect(l.startsWith("Kartoshka")).toBe(true);
    expect(l.endsWith("12 000")).toBe(true);
  });
```

`describe("encodeReceipt", ...)` blokiga, "kirill qator ham AYNAN width bayt egallaydi" testidan keyin (`:142` atrofida):

```ts
  it("paperWidth: 80 → divider 48 ta '-'; default (58) → 32 ta '-'", () => {
    const b58 = encodeReceipt(data);
    const b80 = encodeReceipt(data, { paperWidth: 80 });
    expect(asciiOf(b58)).toContain("-".repeat(32));
    expect(asciiOf(b58)).not.toContain("-".repeat(33));
    expect(asciiOf(b80)).toContain("-".repeat(48));
    expect(asciiOf(b80)).not.toContain("-".repeat(49));
  });
```

- [ ] **Step 2: Testlarni ishga tushirish va muvaffaqiyatsiz bo'lishini tasdiqlash**

Run: `npm test -- escpos-encoder`
Expected: `getCharsPerLine` testlari (2 ta) FAIL — `getCharsPerLine is not a function` (hali export qilinmagan; Babel runtime'da bu `TypeError`, TS compile-xatosi emas). `encodeReceipt`dagi `paperWidth: 80` testi ham FAIL — hozirgi kod `paperWidth`ni o'qimaydi, divider hamon 32 ta bo'lib chiqadi. Yangi `padLine(…, 48)` testi esa PASS bo'ladi — `padLine` allaqachon dinamik kenglikni qo'llab-quvvatlaydi, bu test faqat shu mavjud qobiliyatni qulflaydi.

- [ ] **Step 3: Minimal implementatsiya**

`escpos-encoder.ts`da `EncodeOptions` interfeysi (hozirgi `:67-72`):

```ts
/** 58/80mm → ESC-POS qatordagi belgi soni. Yagona xarita — boshqa joyda takrorlanmasin. */
export function getCharsPerLine(paperWidth: 58 | 80): 32 | 48 {
  return paperWidth === 80 ? 48 : 32;
}

/** Enkoder sozlamalari. Kod sahifasi printer konfiguratsiyasidan keladi. */
export interface EncodeOptions {
  /** Qog'oz kengligi mm'da — domen darajasi. ESC-POS belgi soni `getCharsPerLine()` orqali. */
  paperWidth?: 58 | 80;
  codepage?: Codepage;
}
```

`encodeReceipt` ichida (hozirgi `:84`):

```ts
  const width = getCharsPerLine(opts.paperWidth ?? 58);
```

(`padLine`, `divider`, va boshqa hamma joy o'zgarishsiz qoladi — ular hamon `width: number` chars bilan ishlaydi.)

- [ ] **Step 4: Testlarni ishga tushirish va o'tganini tasdiqlash**

Run: `npm test -- escpos-encoder`
Expected: barcha testlar (eski + yangi) PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/print/escpos-encoder.ts src/features/print/__tests__/escpos-encoder.test.ts
git commit -m "feat(print): getCharsPerLine + EncodeOptions.paperWidth (58/80mm domen modeli)"
```

---

### Task 2: `receipt-template.ts` — `paperWidth` (TDD)

**Files:**
- Modify: `src/features/print/receipt-template.ts`
- Test: `src/features/print/__tests__/receipt-template.test.ts`

**Interfaces:**
- Consumes: hech narsa (mustaqil).
- Produces: `buildReceiptHtml(data: ReceiptData, paperWidth: 58 | 80 = 58): string`. Task 4 shuni chaqiradi.

- [ ] **Step 1: Failing testlarni yozish**

`describe("buildReceiptHtml", ...)` blokiga, "uzun nom 20 belgiga kesiladi" testidan keyin (`:83` atrofida):

```ts
  it("paperWidth=80 → CSS 80mm, default (58) → 58mm", () => {
    const html58 = buildReceiptHtml(base());
    const html80 = buildReceiptHtml(base(), 80);
    expect(html58).toContain("width: 58mm");
    expect(html80).toContain("width: 80mm");
    expect(html80).not.toContain("width: 58mm");
  });

  it("20+ belgili nom 58mm'da kesiladi, 80mm'da (32 belgigacha) kesilmaydi", () => {
    const longName = "Uzunroq mahsulot nomi bu"; // 24 belgi — 20dan uzun, 32dan qisqa
    const html58 = buildReceiptHtml(base({ items: [{ ...unitLine, name: longName }] }));
    const html80 = buildReceiptHtml(base({ items: [{ ...unitLine, name: longName }] }), 80);
    expect(html58).not.toContain(longName);
    expect(html80).toContain(longName);
  });

  it("80mm'da ham summa ustuni siqilmaydi (nowrap) va nom qatordan chiqib ketmaydi (break-word)", () => {
    // Regressiya: konteyner kengligi o'zgarganda ham CSS qoidalari yo'qolmasligi kerak —
    // .amt/.nm nisbiy (%) layout bo'lgani uchun bu ikkalasi width'dan mustaqil.
    const html80 = buildReceiptHtml(base(), 80);
    expect(html80).toContain(".amt { text-align: right; white-space: nowrap;");
    expect(html80).toContain(".nm { word-break: break-word; }");
  });
```

- [ ] **Step 2: Testlarni ishga tushirish va muvaffaqiyatsiz bo'lishini tasdiqlash**

Run: `npm test -- receipt-template`
Expected: birinchi ikkita test FAIL (`buildReceiptHtml` hozircha 2-argumentni e'tiborsiz qoldiradi, CSS doim 58mm). Uchinchi test (`nowrap`/`break-word`) allaqachon PASS — bu qoidalar width'dan mustaqil, mavjud kodda bor; test ularni implementatsiyadan keyin ham yo'qolmasligini qulflaydi.

- [ ] **Step 3: Minimal implementatsiya**

`truncateName` (hozirgi `:18-21`):

```ts
function truncateName(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}
```

`buildReceiptHtml` imzosi va ichki ishlatilishi (hozirgi `:27`, `:31`, `:53`):

```ts
export function buildReceiptHtml(data: ReceiptData, paperWidth: 58 | 80 = 58): string {
  const nameMaxLen = paperWidth === 80 ? 32 : 20;
  const cssWidth = paperWidth === 80 ? "80mm" : "58mm";

  const rows = data.items
    .map(
      (l) => `<tr>
        <td class="nm">${esc(truncateName(l.name, nameMaxLen))} <span class="q">${qtyLabel(l)}</span></td>
        <td class="amt">${formatNumber(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");
  // ... cashBlock/debtBlock o'zgarishsiz
```

CSS qatorida (`:53`):

```ts
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: ${cssWidth}; margin: 0 auto; padding: 6px 8px; }
```

⚠️ Qolgan CSS (`table{width:100%}`, `.amt{white-space:nowrap}`, `.nm{word-break:break-word}`) **O'ZGARTIRILMAYDI** — ular allaqachon nisbiy, konteyner kengligiga o'zi moslashadi (spec'dagi asoslash).

- [ ] **Step 4: Testlarni ishga tushirish va o'tganini tasdiqlash**

Run: `npm test -- receipt-template`
Expected: barcha testlar PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/print/receipt-template.ts src/features/print/__tests__/receipt-template.test.ts
git commit -m "feat(print): buildReceiptHtml paperWidth (58/80mm) qo'llab-quvvatlaydi"
```

---

### Task 3: `printer-settings.ts` — domen modeli + legacy moslik testi

**Files:**
- Modify: `src/features/print/printer-settings.ts`
- Test (YANGI): `src/features/print/__tests__/printer-settings.test.ts`

**Interfaces:**
- Consumes: hech narsa.
- Produces: `PrinterConfig.paperWidth: 58 | 80`, `usePrinterStore().setPaperWidth(w: 58 | 80): void`, `getPrinterConfig().paperWidth` — Task 4 va 5 shularni iste'mol qiladi.

⚠️ Bu birinchi marta `printer-settings.ts` uchun test yoziladi — modul `@/lib/offline/mmkv`ni import qiladi, buning uchun jest mock kerak (Global Constraints'ga qarang).

- [ ] **Step 1: Failing testlarni yozish (YANGI fayl)**

`src/features/print/__tests__/printer-settings.test.ts`:

```ts
/**
 * `printer-settings.ts` `@/lib/offline/mmkv` (react-native-mmkv) import
 * qiladi — loyihada bu modul uchun jest mock yo'q, shuning uchun shu yerda
 * xotiradagi soxta `storage` beriladi (faqat `getString`/`set` — modul
 * shu ikkitasidan boshqasini ishlatmaydi).
 */
const mem = new Map<string, string>();
jest.mock("@/lib/offline/mmkv", () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => {
      mem.set(k, v);
    },
  },
}));

import { usePrinterStore, getPrinterConfig } from "../printer-settings";

beforeEach(() => {
  mem.clear();
  usePrinterStore.setState({
    type: "system",
    btAddress: null,
    btName: null,
    codepage: "cp866",
    paperWidth: 58,
  });
});

describe("printer-settings — legacy moslik", () => {
  it("paperWidth'siz eski JSON → effektiv qiymat 58, storage QAYTA YOZILMAYDI", () => {
    const legacy = { type: "bluetooth", btAddress: "AA:BB", btName: "POS-58", codepage: "cp1251" };
    mem.set("printerConfig", JSON.stringify(legacy));

    const cfg = getPrinterConfig();

    expect(cfg.paperWidth).toBe(58);
    expect(cfg.btAddress).toBe("AA:BB"); // boshqa maydonlar saqlangan
    expect(cfg.codepage).toBe("cp1251");
    expect(mem.get("printerConfig")).toBe(JSON.stringify(legacy)); // o'zgarmagan
  });
});

describe("printer-settings — setPaperWidth", () => {
  it("boshqa maydonlarni buzmasdan paperWidth'ni yangilaydi", () => {
    usePrinterStore.setState({ ...usePrinterStore.getState(), codepage: "cp1251", btAddress: "AA:BB", btName: "X", type: "bluetooth" });
    usePrinterStore.getState().setPaperWidth(80);

    expect(usePrinterStore.getState().paperWidth).toBe(80);
    expect(usePrinterStore.getState().codepage).toBe("cp1251");
    expect(usePrinterStore.getState().btAddress).toBe("AA:BB");
  });

  it("setSystem/setBluetooth chaqirilganda paperWidth saqlanib qoladi", () => {
    usePrinterStore.getState().setPaperWidth(80);
    usePrinterStore.getState().setSystem();
    expect(usePrinterStore.getState().paperWidth).toBe(80);

    usePrinterStore.getState().setBluetooth("AA:BB", "POS-80");
    expect(usePrinterStore.getState().paperWidth).toBe(80);
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirish va muvaffaqiyatsiz bo'lishini tasdiqlash**

Run: `npm test -- printer-settings`
Expected: FAIL — `cfg.paperWidth` `undefined` bo'ladi (`DEFAULT`da hali `paperWidth` yo'q), `usePrinterStore.getState().setPaperWidth` esa `TypeError: ... is not a function` (hali qo'shilmagan).

- [ ] **Step 3: Implementatsiya — `PrinterConfig`ga `paperWidth` va `setPaperWidth` qo'shish**

`PrinterConfig` interfeysi (hozirgi `:11-21`):

```ts
export interface PrinterConfig {
  type: PrinterType;
  btAddress: string | null;
  btName: string | null;
  codepage: Codepage;
  /** Qog'oz kengligi mm'da — 58 (standart) yoki 80. */
  paperWidth: 58 | 80;
}
```

`DEFAULT` (hozirgi `:24-29`):

```ts
const DEFAULT: PrinterConfig = {
  type: "system",
  btAddress: null,
  btName: null,
  codepage: "cp866",
  paperWidth: 58,
};
```

`PrinterStore` interfeysi (hozirgi `:49-53`):

```ts
interface PrinterStore extends PrinterConfig {
  setSystem: () => void;
  setBluetooth: (address: string, name: string) => void;
  setCodepage: (codepage: Codepage) => void;
  setPaperWidth: (paperWidth: 58 | 80) => void;
}
```

`usePrinterStore` ichida `setSystem`/`setBluetooth` `paperWidth`ni saqlab qolishi (hozirgi `:57-69`):

```ts
  setSystem: () =>
    set(() => {
      const c: PrinterConfig = { ...DEFAULT, codepage: get().codepage, paperWidth: get().paperWidth, type: "system" };
      save(c);
      return c;
    }),
  setBluetooth: (btAddress, btName) =>
    set(() => {
      const c: PrinterConfig = { type: "bluetooth", btAddress, btName, codepage: get().codepage, paperWidth: get().paperWidth };
      save(c);
      return c;
    }),
```

va yangi action (`setCodepage`dan keyin, `:70-80` atrofida):

```ts
  setPaperWidth: (paperWidth) =>
    set((s) => {
      const c: PrinterConfig = {
        type: s.type,
        btAddress: s.btAddress,
        btName: s.btName,
        codepage: s.codepage,
        paperWidth,
      };
      save(c);
      return c;
    }),
```

- [ ] **Step 4: Testlarni ishga tushirish va o'tganini tasdiqlash**

Run: `npm test -- printer-settings`
Expected: barcha testlar PASS (legacy moslik uchun `load()`ning mavjud `{...DEFAULT, ...parsed}` xatti-harakati qo'shimcha o'zgarishsiz to'g'ri ishlaydi — `DEFAULT.paperWidth: 58` qo'shilishi kifoya).

- [ ] **Step 5: Kompilyatsiyani tekshirish**

Run: `npm run typecheck`
Expected: xatosiz.

- [ ] **Step 6: Commit**

```bash
git add src/features/print/printer-settings.ts src/features/print/__tests__/printer-settings.test.ts
git commit -m "feat(print): PrinterConfig.paperWidth (58|80) + legacy moslik testi"
```

---

### Task 4: `documents.ts` — ulash + to'liq oqim integratsiya testi

**Files:**
- Modify: `src/features/print/documents.ts`
- Test (YANGI): `src/features/print/__tests__/documents.test.ts`

**Interfaces:**
- Consumes: Task 1'dan `EncodeOptions.paperWidth`, Task 2'dan `buildReceiptHtml(data, paperWidth)`, Task 3'dan `usePrinterStore`/`getPrinterConfig`.
- Produces: hech narsa (terminal — Task 5 UI shu faylni chaqirmaydi, to'g'ridan-to'g'ri store'ni ishlatadi).

- [ ] **Step 1: To'liq oqim testini yozish (YANGI fayl)**

`src/features/print/__tests__/documents.test.ts` — bu test **helper emas, haqiqiy zanjirni** (store → `getPrinterConfig` → `receiptDocument` → `encodeReceipt`/`buildReceiptHtml`) tekshiradi:

```ts
const mem = new Map<string, string>();
jest.mock("@/lib/offline/mmkv", () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => {
      mem.set(k, v);
    },
  },
}));

import { usePrinterStore } from "../printer-settings";
import { receiptDocument } from "../documents";
import type { ReceiptData } from "../types";

const data: ReceiptData = {
  shopName: "Dilshod Market",
  saleId: "offline-abcdef12-3456",
  soldAt: "2026-06-26T09:18:00.000Z",
  items: [{ name: "Non", saleType: "unit", quantity: 2, unitPrice: 3000, lineTotal: 6000 }],
  totalRevenue: 6000,
  paymentMethod: "Naqd",
  givenAmount: 10000,
  changeAmount: 4000,
};

function asciiOf(b: Uint8Array): string {
  return Array.from(b)
    .filter((n) => n >= 32 && n <= 126)
    .map((n) => String.fromCharCode(n))
    .join("");
}

beforeEach(() => {
  mem.clear();
  usePrinterStore.setState({ type: "system", btAddress: null, btName: null, codepage: "cp866", paperWidth: 58 });
});

describe("receiptDocument — to'liq oqim (store → encoder/html)", () => {
  it("paperWidth=58 (default): ESC-POS divider 32, HTML 58mm", () => {
    const doc = receiptDocument(data);
    expect(asciiOf(doc.escpos())).toContain("-".repeat(32));
    expect(doc.html()).toContain("width: 58mm");
  });

  it("paperWidth=80 (store orqali): ESC-POS divider 48, HTML 80mm", () => {
    usePrinterStore.getState().setPaperWidth(80);
    const doc = receiptDocument(data);
    expect(asciiOf(doc.escpos())).toContain("-".repeat(48));
    expect(doc.html()).toContain("width: 80mm");
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirish va muvaffaqiyatsiz bo'lishini tasdiqlash**

Run: `npm test -- documents`
Expected: ikkala test FAIL — `receiptDocument()` hali `paperWidth`ni `encodeReceipt`/`buildReceiptHtml`ga uzatmaydi, shuning uchun `paperWidth=80` holatida ham natija 58mm/32-belgili bo'lib chiqadi.

- [ ] **Step 3: Implementatsiya — `receiptDocument()`ni ulash**

`documents.ts:30-36`:

```ts
export function receiptDocument(data: ReceiptData): PrintDocument {
  return {
    title: `Chek #${shortReceiptId(data.saleId)}`,
    escpos: () => {
      const cfg = getPrinterConfig();
      return encodeReceipt(data, { codepage: cfg.codepage, paperWidth: cfg.paperWidth });
    },
    html: () => buildReceiptHtml(data, getPrinterConfig().paperWidth),
  };
}
```

- [ ] **Step 4: Testlarni ishga tushirish va o'tganini tasdiqlash**

Run: `npm test -- documents`
Expected: ikkala test PASS.

- [ ] **Step 5: Regressiya — Task 1–3 testlari hamon o'tishini tasdiqlash**

Run: `npm test -- escpos-encoder receipt-template printer-settings documents`
Expected: barchasi PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/print/documents.ts src/features/print/__tests__/documents.test.ts
git commit -m "feat(print): receiptDocument paperWidth'ni ESC-POS va HTML'ga uzatadi (to'liq oqim testi)"
```

---

### Task 5: `printer-settings.tsx` UI + i18n (3 til)

**Files:**
- Modify: `src/app/printer-settings.tsx`
- Modify: `src/i18n/locales/uz-Latn.json`
- Modify: `src/i18n/locales/uz-Cyrl.json`
- Modify: `src/i18n/locales/ru.json`

**Interfaces:**
- Consumes: Task 3'dan `usePrinterStore((s) => s.paperWidth)`, `usePrinterStore((s) => s.setPaperWidth)`.
- Produces: hech narsa (terminal — UI qatlami, ekran fayllari uchun loyihada test yo'q, qurilmada tekshiriladi).

- [ ] **Step 1: i18n kalitlari — `uz-Latn.json`**

`printer.codepageHeader`dan OLDIN (`:1187`), yangi bo'lim:

```json
    "widthHeader": "QOG'OZ KENGLIGI",
    "width58": "58mm",
    "width58Sub": "Standart termal printer",
    "width80": "80mm",
    "width80Sub": "Keng termal printer",
```

`btTitle`ni yangilash (`:1166`) — kenglik endi mustaqil sozlama:

```json
    "btTitle": "Bluetooth termal",
```

- [ ] **Step 2: i18n kalitlari — `uz-Cyrl.json`**

Xuddi shu joyga:

```json
    "widthHeader": "ҚОГ'ОЗ КЕНГЛИГИ",
    "width58": "58мм",
    "width58Sub": "Стандарт термал принтер",
    "width80": "80мм",
    "width80Sub": "Кенг термал принтер",
```

`btTitle` (`:1166`):

```json
    "btTitle": "Bluetooth термал",
```

- [ ] **Step 3: i18n kalitlari — `ru.json`**

Xuddi shu joyga:

```json
    "widthHeader": "ШИРИНА БУМАГИ",
    "width58": "58мм",
    "width58Sub": "Стандартный термопринтер",
    "width80": "80мм",
    "width80Sub": "Широкий термопринтер",
```

`btTitle` (`:1166`):

```json
    "btTitle": "Bluetooth-термопринтер",
```

- [ ] **Step 4: `printer-settings.tsx`ga bo'lim qo'shish**

Store hook'lari (`:71-77`ga qo'shish):

```ts
  const paperWidth = usePrinterStore((s) => s.paperWidth);
  const setPaperWidth = usePrinterStore((s) => s.setPaperWidth);
```

Yangi bo'lim — ikkita `TypeCard`dan KEYIN, `btPanelOpen ? (...)` blokidan OLDIN (`:231-233` orasiga — Bluetooth panelidan TASHQARIDA, ikkala ulanish turiga ham tegishli):

```tsx
        <View style={{ marginTop: 20 }}>
          <SectionLabel>{t("printer.widthHeader")}</SectionLabel>
          {(
            [
              [58, t("printer.width58"), t("printer.width58Sub")],
              [80, t("printer.width80"), t("printer.width80Sub")],
            ] as [58 | 80, string, string][]
          ).map(([w, label, sub]) => (
            <Pressable
              key={w}
              onPress={() => setPaperWidth(w)}
              accessibilityRole="radio"
              accessibilityState={{ selected: paperWidth === w }}
              accessibilityLabel={label}
              className="mb-2 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
              style={{
                borderWidth: 1.5,
                borderColor: paperWidth === w ? colors.primary : colors.line,
              }}
            >
              <Ionicons
                name={paperWidth === w ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={paperWidth === w ? colors.primary : colors.tabInactive}
              />
              <View className="flex-1">
                <Text className="text-base text-ink">{label}</Text>
                <Text className="text-xs text-muted">{sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
```

- [ ] **Step 5: Lint va typecheck**

Run: `npm run lint && npm run typecheck`
Expected: ikkalasi ham 0 xato.

- [ ] **Step 6: Qurilmada/emulyatorda qo'lda tekshirish**

`npm start` → Sozlamalar → Printer → "Qog'oz kengligi" bo'limi Bluetooth VA Tizim printeri holatlarining IKKALASIDA ham ko'rinishi, 58mm/80mm almashtirish ishlashi, "Test chek chiqarish" natijasi (PDF yo'lida) kengligiga mos chiqishi.

- [ ] **Step 7: Commit**

```bash
git add src/app/printer-settings.tsx src/i18n/locales/uz-Latn.json src/i18n/locales/uz-Cyrl.json src/i18n/locales/ru.json
git commit -m "feat(print): printer sozlamalarida 58mm/80mm tanlash bo'limi (ulanish turidan mustaqil)"
```

---

### Task 6: Compatibility hujjat + loyiha hujjatlari

**Files:**
- Create: `docs/PRINTER_COMPATIBILITY.md`
- Modify: `CLAUDE.md`
- Modify: `docs/QURILMADA_SINOV.md`

- [ ] **Step 1: `docs/PRINTER_COMPATIBILITY.md` yaratish**

```markdown
# Printer moslik jadvali

Faqat **qurilmada haqiqiy sinovdan o'tgan** modellar shu yerga qo'shiladi —
o'ylab topilgan yoki tekshirilmagan qator YO'Q. Yangi model sinalgach,
qatorni shu jadvalga qo'shing.

| Printer modeli | Ulanish | Kenglik | Holat |
|---|---|---|---|
| _(hali sinalgan model yo'q)_ | — | — | — |

**Ustunlar:**
- **Ulanish** — Bluetooth (SPP/ESC-POS) yoki Tizim printeri (PDF/HTML).
- **Kenglik** — 58mm yoki 80mm.
- **Holat** — "Sinovdan o'tgan (SANA)" yoki "Muammoli (tavsif)".

Qo'llab-quvvatlanadigan diapazon: ESC-POS-mos 58mm va 80mm termal chek
printerlar. Boshqa o'lcham (57mm, 76mm, 100mm, A4) va avtomatik model/
kenglik aniqlash qamrovdan tashqari — batafsil: `CLAUDE.md`.
```

- [ ] **Step 2: `CLAUDE.md`dagi "Ochiq: 80mm qog'oz kengligi" bandini yangilash**

Hozirgi paragraf ("Ochiq: 80mm qog'oz kengligi..." bilan boshlanadigan, POS ishonchliligi bo'limi oxirida) — bajarilgan deb belgilanadi:

```markdown
**58mm + 80mm qog'oz kengligi ✅ (2026-08-19).** `PrinterConfig.paperWidth:
58 | 80` — domen darajasida (ESC-POS'dagi 32/48-belgi `getCharsPerLine()`
orqali FAQAT `escpos-encoder.ts` ichida hisoblanadi, boshqa joyda
takrorlanmaydi). Printer sozlamalarida tanlanadi, Bluetooth/Tizim
printeridan MUSTAQIL (`btPanelOpen` shartidan tashqarida). ESC-POS
(`escpos-encoder.ts`) va Tizim printeri/PDF (`receipt-template.ts`)
ikkalasi ham hurmat qiladi. Default 58mm — eski foydalanuvchiga ta'sir
yo'q (`load()`ning mavjud `{...DEFAULT, ...parsed}` xatti-harakati
bilan). Moslik jadvali: `docs/PRINTER_COMPATIBILITY.md` (hali bo'sh —
faqat qurilmada sinalgan modellar qo'shiladi). Qurilmada haqiqiy 80mm
printer bilan hali sinalmagan (`docs/QURILMADA_SINOV.md` 7-bo'lim).
```

- [ ] **Step 3: `docs/QURILMADA_SINOV.md` 7-bo'limiga 80mm qatorlarini qo'shish**

7.1 dan keyin, yangi kichik bo'lim (7.7):

```markdown
### 7.7 Qog'oz kengligi (58mm/80mm)

- [ ] Sozlamalar → Printer → "Qog'oz kengligi" bo'limi **Bluetooth VA
      Tizim printeri** holatlarining ikkalasida ham ko'rinishi
- [ ] **80mm** tanlang → test chek chiqarish → qatorlar kengroq (48 belgi)
      joylashishi, summalar hamon o'ng chetga tekis turishi
- [ ] Uzunroq mahsulot nomi (21–32 belgi) 80mm'da **kesilmasligi**
      (58mm'da kesilardi)
- [ ] **58mm**ga qaytaring → eski xatti-harakat aynan tiklanishi
- [ ] Tizim printeri (PDF) tanlangan holatda ham 80mm ta'sir qilishi —
      "Ulashish" orqali PDF'ni oching, kengligi mos kelishi
- [ ] Oddiy chek, ko'p mahsulotli chek, uzun nom, miqdor, narx, jami,
      chiziq (divider), qalin (bold) — barchasi 80mm'da to'g'ri
      joylashishi
- [ ] Sinovdan o'tgan model topilsa `docs/PRINTER_COMPATIBILITY.md`ga
      qator qo'shing
```

- [ ] **Step 4: Commit**

```bash
git add docs/PRINTER_COMPATIBILITY.md CLAUDE.md docs/QURILMADA_SINOV.md
git commit -m "docs: 58mm+80mm qog'oz kengligi bajarildi, moslik jadvali va sinov ro'yxati"
```

---

### Task 7: Yakuniy tekshiruv

**Files:** (yo'q — faqat tekshiruv)

- [ ] **Step 1: To'liq test to'plami**

Run: `npm test`
Expected: barcha testlar PASS (eski + Task 1–4'dagi yangilari), 0 fail.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 xato.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 xato (mavjud 18 ta ataylab qoldirilgan `react-hooks/set-state-in-effect` ogohlantirishidan tashqari — `CLAUDE.md`ga qarang).

- [ ] **Step 4: Yakuniy hisobot tayyorlash**

Foydalanuvchiga: qaysi fayllar o'zgardi, qanday arxitektura qarorlari qilindi (domen modeli `58|80`, `getCharsPerLine` yagona xarita, CSS'ning qolgan qismi nega o'zgartirilmadi), qaysi testlar qo'shildi (5 fayl: 3 mavjud kengaytirildi + 2 yangi), test/typecheck/lint natijalari, real hardware sinovi kerak bo'lgan joylar (`docs/QURILMADA_SINOV.md` 7.7).

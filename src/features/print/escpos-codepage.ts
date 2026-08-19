/**
 * Termal printer kod sahifalari (codepage) — SOF modul.
 *
 * Muammo: ESC-POS printer UTF-8 BILMAYDI. U bir baytli jadval bilan ishlaydi
 * va qaysi jadval ekanini `ESC t n` buyrug'i tanlaydi. Ilgari biz faqat ASCII
 * (32–126) yuborardik va kirill matn `?` bo'lib chiqardi — "Хива Маркет" →
 * "???? ??????".
 *
 * ⚠️ `n` raqami printer MODELIGA qarab farq qiladi. Epson spetsifikatsiyasida
 * 17 = PC866, 73 = WPC1251; arzon xitoy klonlari odatda shunga mos keladi,
 * lekin kafolat yo'q. Shu sababdan sahifa SOZLAMADA tanlanadi va test chek
 * bilan tekshiriladi — printer qo'llamasa foydalanuvchi `ascii` ga tushadi.
 */

export type Codepage = "ascii" | "cp866" | "cp1251";

const ESC = 0x1b;

/** `ESC t n` — printer ichki jadvalini tanlash. `ascii` uchun buyruq yo'q. */
export function codepageCommand(cp: Codepage): number[] {
  switch (cp) {
    case "cp866":
      return [ESC, 0x74, 17]; // PC866 (Cyrillic #2)
    case "cp1251":
      return [ESC, 0x74, 73]; // WPC1251 (Cyrillic)
    default:
      return [];
  }
}

/**
 * O'ZBEK KIRILL harflarining ikkala sahifada HAM yo'qlari.
 *
 * CP866 ham, CP1251 ham RUS kirilli uchun qilingan: қ/ғ/ҳ ularda yo'q.
 * `?` chiqarish o'rniga eng yaqin harfga o'tkazamiz — "Ғишт" `?ишт` emas,
 * `Гишт` bo'lib chiqadi va o'qiladi. Ў/ў esa IKKALA sahifada bor, shuning
 * uchun ular o'zgartirilmaydi.
 */
const UZ_CYRILLIC_FALLBACK: Record<string, string> = {
  "Қ": "К", // Қ → К
  "қ": "к", // қ → к
  "Ғ": "Г", // Ғ → Г
  "ғ": "г", // ғ → г
  "Ҳ": "Х", // Ҳ → Х
  "ҳ": "х", // ҳ → х
};

/**
 * Chop etishdan oldingi matn normalizatsiyasi — kod sahifasidan MUSTAQIL.
 *
 * Qator kengligi (`padLine`) shu ko'rinish bo'yicha o'lchanadi: har belgi
 * aynan bitta baytga aylangani uchun belgi soni = bayt soni.
 */
export function normalizeText(s: string): string {
  let out = s
    .replace(/[ʻʼ‘’`]/g, "'") // o'zbek lotin apostroflari
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...");
  for (const [from, to] of Object.entries(UZ_CYRILLIC_FALLBACK)) {
    out = out.split(from).join(to);
  }
  return out;
}

function buildCp866(): Map<string, number> {
  const m = new Map<string, number>();
  // А(U+0410)–Я(U+042F) → 0x80–0x9F
  for (let i = 0; i < 32; i += 1) m.set(String.fromCharCode(0x0410 + i), 0x80 + i);
  // а(U+0430)–п(U+043F) → 0xA0–0xAF
  for (let i = 0; i < 16; i += 1) m.set(String.fromCharCode(0x0430 + i), 0xa0 + i);
  // р(U+0440)–я(U+044F) → 0xE0–0xEF  (CP866 da kichik harflar IKKI bo'lakka bo'lingan)
  for (let i = 0; i < 16; i += 1) m.set(String.fromCharCode(0x0440 + i), 0xe0 + i);
  m.set("Ё", 0xf0); // Ё
  m.set("ё", 0xf1); // ё
  m.set("Є", 0xf2); // Є
  m.set("є", 0xf3); // є
  m.set("Ї", 0xf4); // Ї
  m.set("ї", 0xf5); // ї
  m.set("Ў", 0xf6); // Ў
  m.set("ў", 0xf7); // ў
  m.set("°", 0xf8); // °
  m.set("№", 0xfc); // №
  return m;
}

function buildCp1251(): Map<string, number> {
  const m = new Map<string, number>();
  // CP1251 da kirill YAXLIT: А–Я → 0xC0–0xDF, а–я → 0xE0–0xFF
  for (let i = 0; i < 32; i += 1) m.set(String.fromCharCode(0x0410 + i), 0xc0 + i);
  for (let i = 0; i < 32; i += 1) m.set(String.fromCharCode(0x0430 + i), 0xe0 + i);
  m.set("Ё", 0xa8); // Ё
  m.set("ё", 0xb8); // ё
  m.set("Ў", 0xa1); // Ў
  m.set("ў", 0xa2); // ў
  m.set("Є", 0xaa); // Є
  m.set("є", 0xba); // є
  m.set("Ї", 0xaf); // Ї
  m.set("ї", 0xbf); // ї
  m.set("І", 0xb2); // І
  m.set("і", 0xb3); // і
  m.set("Ґ", 0xa5); // Ґ
  m.set("ґ", 0xb4); // ґ
  m.set("°", 0xb0); // °
  m.set("№", 0xb9); // №
  return m;
}

// Jadvallar bir marta quriladi (har chek uchun emas).
const TABLES: Record<Exclude<Codepage, "ascii">, Map<string, number>> = {
  cp866: buildCp866(),
  cp1251: buildCp1251(),
};

const QUESTION = 0x3f; // '?'

/**
 * Matn → baytlar. HAR belgi AYNAN BITTA bayt — qator kengligi hisobi
 * (`padLine`) shunga tayanadi, aks holda summalar o'ngga tekislanmasdi.
 *
 * Jadvalda yo'q belgi `?` bo'ladi. `\n` (LF) o'tkaziladi.
 */
export function encodeText(s: string, cp: Codepage): number[] {
  const table = cp === "ascii" ? null : TABLES[cp];
  const out: number[] = [];
  for (const ch of normalizeText(s)) {
    const code = ch.charCodeAt(0);
    if (code === 0x0a) {
      out.push(0x0a);
      continue;
    }
    if (code >= 32 && code <= 126) {
      out.push(code); // ASCII yarmi barcha sahifalarda BIR XIL
      continue;
    }
    out.push(table?.get(ch) ?? QUESTION);
  }
  return out;
}

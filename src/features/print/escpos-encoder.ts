import { formatNumber, formatCurrency, formatDateTimeFull } from "@/lib/format";
import { shortReceiptId } from "./receipt-id";
import { codepageCommand, encodeText, normalizeText, type Codepage } from "./escpos-codepage";
import type { ReceiptData, ReceiptLine } from "./types";
import type { LabelData } from "@/features/labels/barcode-format";

/**
 * ESC-POS bayt enkoderi — termal printer (58/80mm) uchun. SOF funksiyalar
 * (native importsiz → test qilinadi, transportdan mustaqil).
 *
 * Belgi → bayt aylantirish `escpos-codepage.ts` da: kirill matn tanlangan kod
 * sahifasi bilan chiqadi, lotin esa har qanday sahifada bir xil.
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const INIT = [ESC, 0x40];
const ALIGN_LEFT = [ESC, 0x61, 0];
const ALIGN_CENTER = [ESC, 0x61, 1];
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];
const SIZE_NORMAL = [GS, 0x21, 0x00];
const SIZE_DOUBLE = [GS, 0x21, 0x11]; // 2x bo'y + en
const CUT = [GS, 0x56, 0x00]; // to'liq kesish (printer qo'llab-quvvatlasa)
const feed = (n: number): number[] => [ESC, 0x64, n];

/**
 * ASCII rejimidagi tozalash — kod sahifasi `ascii` bo'lganda nima chiqishini
 * ko'rsatadi (kirill `?` bo'ladi).
 *
 * ⚠️ Bu endi YAGONA yo'l EMAS: kirill uchun `encodeText(s, "cp866")` ishlatiladi.
 */
export function sanitize(s: string): string {
  return normalizeText(s)
    .split("")
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 10) return "\n";
      return c >= 32 && c <= 126 ? ch : "?";
    })
    .join("");
}

/**
 * Chap matn + o'ng matn (summa) ni `width` belgili qatorga joylaydi (o'ng tekis).
 *
 * Kenglik NORMALIZATSIYA qilingan matn bo'yicha o'lchanadi (`sanitize` emas):
 * kirill harf ham aynan bitta bayt egallaydi, shuning uchun uni `?` ga
 * aylantirmasdan sanash to'g'ri natija beradi. Ilgari `sanitize` ishlatilganda
 * ham uzunlik to'g'ri chiqardi (belgi soni o'zgarmasdi) — lekin endi bu
 * bog'liqlik ATAYLAB uzildi, aks holda kirill qo'shilishi bilan tekislash
 * jimgina buzilishi mumkin edi.
 */
export function padLine(left: string, right: string, width = 32): string {
  const l = normalizeText(left);
  const r = normalizeText(right);
  const maxLeft = Math.max(0, width - r.length - 1);
  const lt = l.length > maxLeft ? l.slice(0, maxLeft) : l;
  const gap = Math.max(1, width - lt.length - r.length);
  return lt + " ".repeat(gap) + r;
}

/** 58/80mm → ESC-POS qatordagi belgi soni. Yagona xarita — boshqa joyda takrorlanmasin. */
export function getCharsPerLine(paperWidth: 58 | 80): 32 | 48 {
  return paperWidth === 80 ? 48 : 32;
}

function itemLeft(it: ReceiptLine): string {
  return it.saleType === "weight" ? `${it.name} ${it.quantity.toFixed(3)}kg` : `${it.name} x${it.quantity}`;
}

/** Enkoder sozlamalari. Kod sahifasi printer konfiguratsiyasidan keladi. */
export interface EncodeOptions {
  /** Qog'oz kengligi mm'da — domen darajasi. ESC-POS belgi soni `getCharsPerLine()` orqali. */
  paperWidth?: 58 | 80;
  codepage?: Codepage;
}

/**
 * ⚠️ Default `cp866` (ASCII EMAS). Sabab: O'zbekiston bozorida chek matni
 * ko'pincha kirillda bo'ladi va ASCII rejimida u `?` bo'lib chiqardi.
 * Lotin matn uchun farq YO'Q — 0x00–0x7F barcha sahifalarda bir xil, faqat
 * boshida `ESC t 17` buyrug'i qo'shiladi.
 */
const DEFAULT_CODEPAGE: Codepage = "cp866";

/** ReceiptData → ESC-POS baytlar. */
export function encodeReceipt(data: ReceiptData, opts: EncodeOptions = {}): Uint8Array {
  const width = getCharsPerLine(opts.paperWidth ?? 58);
  const cp = opts.codepage ?? DEFAULT_CODEPAGE;
  const bytes = (s: string): number[] => encodeText(s, cp);
  const line = (s: string): number[] => [...bytes(s), LF];

  const out: number[] = [];
  const add = (...chunks: number[][]) => chunks.forEach((c) => out.push(...c));
  const divider = "-".repeat(width);

  add(INIT);
  // Kod sahifasi INIT'dan KEYIN: `ESC @` printerni tiklaydi va tanlangan
  // sahifani standart holatga qaytaradi — oldin yuborilsa bekor bo'lardi.
  add(codepageCommand(cp));
  // Do'kon — markaz, bold, 2x
  add(ALIGN_CENTER, BOLD_ON, SIZE_DOUBLE, line(data.shopName), SIZE_NORMAL, BOLD_OFF);
  if (data.shopPhone) add(line(`Tel: ${data.shopPhone}`));
  if (data.shopAddress) add(line(data.shopAddress));

  // Tana — chapga tekis
  add(ALIGN_LEFT, line(divider));
  add(line(`Chek #${shortReceiptId(data.saleId)}`));
  add(line(formatDateTimeFull(data.soldAt)));
  if (data.cashierName) add(line(`Kassir: ${data.cashierName}`));
  add(line(divider));

  for (const it of data.items) {
    add(line(padLine(itemLeft(it), formatNumber(it.lineTotal), width)));
  }
  add(line(divider));

  add(BOLD_ON, line(padLine("JAMI", `${formatNumber(data.totalRevenue)} so'm`, width)), BOLD_OFF);
  add(line(padLine("To'lov", data.paymentMethod, width)));
  if (data.paymentMethod === "Naqd" && data.givenAmount != null) {
    add(line(padLine("Berilgan", formatNumber(data.givenAmount), width)));
    add(line(padLine("Qaytim", formatNumber(data.changeAmount ?? 0), width)));
  }
  if (data.debtAmount != null && data.debtAmount > 0) {
    add(line(padLine("Nasiyaga", formatNumber(data.debtAmount), width)));
    if (data.customerName) add(line(padLine("Mijoz", data.customerName, width)));
  }

  add(ALIGN_CENTER, feed(1), line("Rahmat! Xayrli kun!"), feed(3), CUT);
  return Uint8Array.from(out);
}

// ── Yorliq (narx etiketkasi) ────────────────────────────────────────────────

const HRI_BELOW = [GS, 0x48, 0x02]; // barcode raqamini chiziq OSTIDA ko'rsatish
const HRI_FONT_A = [GS, 0x66, 0x00];
const bcHeight = (n: number): number[] => [GS, 0x68, n]; // GS h — barcode balandligi
const bcWidth = (n: number): number[] => [GS, 0x77, n]; // GS w — modul eni (2–6)

/**
 * CODE128 barcode (GS k 73). ESC-POS ma'lumoti kod-to'plam selektori bilan
 * boshlanadi. Juft sonli raqamli kod → "{C" (har bayt 2 raqam = 2× QISQA);
 * aks holda "{B" (ASCII). Skaner baribir o'sha qiymatni o'qiydi.
 */
function code128Bytes(value: string): number[] {
  // Barcode ATAYLAB `sanitize` bilan — CODE128 ma'lumoti sof ASCII bo'lishi
  // shart. Kod sahifasi bu yerda ishlatilmaydi: printer barcode baytlarini
  // matn sifatida emas, grafik sifatida talqin qiladi.
  const v = sanitize(value);
  const useC = /^\d+$/.test(v) && v.length % 2 === 0;
  const data: number[] = [0x7b, useC ? 0x43 : 0x42]; // "{C" yoki "{B"
  if (useC) {
    for (let i = 0; i < v.length; i += 2) data.push(Number(v.slice(i, i + 2)));
  } else {
    for (const ch of v) data.push(ch.charCodeAt(0));
  }
  return [GS, 0x6b, 73, data.length, ...data];
}

/**
 * Yorliqlar → ESC-POS baytlar. Har yorliq: (do'kon) nom + yirik narx + barcode
 * (printer GS k bilan o'zi chizadi — aniq/skanerlanadigan) + kesish. cost_price YO'Q.
 */
export function encodeLabel(labels: LabelData[], opts: EncodeOptions = {}): Uint8Array {
  const cp = opts.codepage ?? DEFAULT_CODEPAGE;
  const line = (s: string): number[] => [...encodeText(s, cp), LF];

  const out: number[] = [];
  const add = (...chunks: number[][]) => chunks.forEach((c) => out.push(...c));

  add(INIT);
  add(codepageCommand(cp));
  for (const l of labels) {
    add(ALIGN_CENTER);
    if (l.shopName) add(line(l.shopName));
    add(BOLD_ON, line(l.name), BOLD_OFF);
    add(BOLD_ON, SIZE_DOUBLE, line(formatCurrency(l.price)), SIZE_NORMAL, BOLD_OFF);
    if (l.barcode) {
      add(HRI_BELOW, HRI_FONT_A, bcHeight(70), bcWidth(2), code128Bytes(l.barcode), [LF]);
    }
    add(feed(1), CUT);
  }
  return Uint8Array.from(out);
}

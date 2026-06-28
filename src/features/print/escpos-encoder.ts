import { formatNumber, formatCurrency, formatDateTimeFull } from "@/lib/format";
import type { ReceiptData, ReceiptLine } from "./types";
import type { LabelData } from "@/features/labels/barcode-format";

/**
 * ESC-POS bayt enkoderi — termal printer (58/80mm) uchun. SOF funksiyalar
 * (native importsiz → test qilinadi, BT kutubxonasidan mustaqil). ASCII-safe:
 * lotin o'zbek apostroflari ' ga, maxsus belgilar tozalanadi (termal printerlar
 * default codepage'da faqat ASCII'ni ishonchli chizadi).
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

/** Faqat printable ASCII (32–126) qoldiradi; o'zbek/maxsus belgilarni moslaydi. */
export function sanitize(s: string): string {
  return s
    .replace(/[ʻʼ‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .split("")
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 10) return "\n";
      return c >= 32 && c <= 126 ? ch : "?";
    })
    .join("");
}

/** Chap matn + o'ng matn (summa) ni `width` belgili qatorga joylaydi (o'ng tekis). */
export function padLine(left: string, right: string, width = 32): string {
  const l = sanitize(left);
  const r = sanitize(right);
  const maxLeft = Math.max(0, width - r.length - 1);
  const lt = l.length > maxLeft ? l.slice(0, maxLeft) : l;
  const gap = Math.max(1, width - lt.length - r.length);
  return lt + " ".repeat(gap) + r;
}

function shortId(id: string): string {
  const clean = id.replace(/^offline-/, "").replace(/^qr-/, "");
  return clean.length > 8 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
}

function itemLeft(it: ReceiptLine): string {
  return it.saleType === "weight" ? `${it.name} ${it.quantity.toFixed(3)}kg` : `${it.name} x${it.quantity}`;
}

function bytes(s: string): number[] {
  const out: number[] = [];
  for (const ch of sanitize(s)) out.push(ch.charCodeAt(0));
  return out;
}

function line(s: string): number[] {
  return [...bytes(s), LF];
}

/** ReceiptData → ESC-POS baytlar (number[], har biri 0–255). */
export function encodeReceipt(data: ReceiptData, width = 32): number[] {
  const out: number[] = [];
  const add = (...chunks: number[][]) => chunks.forEach((c) => out.push(...c));
  const divider = "-".repeat(width);

  add(INIT);
  // Do'kon — markaz, bold, 2x
  add(ALIGN_CENTER, BOLD_ON, SIZE_DOUBLE, line(data.shopName), SIZE_NORMAL, BOLD_OFF);
  if (data.shopPhone) add(line(`Tel: ${data.shopPhone}`));
  if (data.shopAddress) add(line(data.shopAddress));

  // Tana — chapga tekis
  add(ALIGN_LEFT, line(divider));
  add(line(`Chek #${shortId(data.saleId)}`));
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
  return out;
}

// ── Yorliq (narx etiketkasi) ────────────────────────────────────────────────

const HRI_BELOW = [GS, 0x48, 0x02]; // barcode raqamini chiziq OSTIDA ko'rsatish
const HRI_FONT_A = [GS, 0x66, 0x00];
const bcHeight = (n: number): number[] => [GS, 0x68, n]; // GS h — barcode balandligi
const bcWidth = (n: number): number[] => [GS, 0x77, n]; // GS w — modul eni (2–6)

/**
 * CODE128 barcode (GS k 73). ESC-POS CODE128 ma'lumoti kod-to'plam selektori
 * bilan boshlanadi: "{B" (code set B). Faqat printable ASCII uzatiladi.
 */
function code128Bytes(value: string): number[] {
  const payload = `{B${sanitize(value)}`;
  const data: number[] = [];
  for (const ch of payload) data.push(ch.charCodeAt(0));
  return [GS, 0x6b, 73, data.length, ...data];
}

/**
 * Yorliqlar → ESC-POS baytlar. Har yorliq: (do'kon) nom + yirik narx + barcode
 * (printer GS k bilan o'zi chizadi — aniq/skanerlanadigan) + kesish. cost_price YO'Q.
 */
export function encodeLabel(labels: LabelData[]): number[] {
  const out: number[] = [];
  const add = (...chunks: number[][]) => chunks.forEach((c) => out.push(...c));

  add(INIT);
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
  return out;
}

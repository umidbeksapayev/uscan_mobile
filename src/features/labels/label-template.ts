import { formatCurrency } from "@/lib/format";
import { code128Svg } from "./barcode-svg";
import type { LabelData } from "./barcode-format";

/**
 * Narx yorliqlari to'ri HTML'i (sof funksiya — expo-print uchun). A4/oddiy yoki
 * PDF printerga mos: flex-wrap to'r, mm o'lchamlar, har yorliq page-break ichida
 * bo'linmaydi. Barcode inline SVG (code128Svg) — skanerlanadigan. cost_price YO'Q.
 */

export interface LabelSheetOptions {
  /** Bitta yorliq eni (mm). */
  labelWidthMm?: number;
  /** Bitta yorliq bo'yi (mm). */
  labelHeightMm?: number;
  /** Do'kon nomini ko'rsatish. */
  showShopName?: boolean;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildLabelsHtml(labels: LabelData[], opts: LabelSheetOptions = {}): string {
  const w = opts.labelWidthMm ?? 50;
  const h = opts.labelHeightMm ?? 30;

  const cells = labels
    .map((l) => {
      const shop =
        opts.showShopName && l.shopName ? `<div class="shop">${esc(l.shopName)}</div>` : "";
      const bc = l.barcode
        ? `<div class="bcwrap">${code128Svg(l.barcode, { moduleMm: 0.33, heightMm: 11 })}<div class="bcval">${esc(l.barcode)}</div></div>`
        : `<div class="nobc">${esc(l.name)}</div>`;
      return `
      <div class="label">
        ${shop}
        <div class="name">${esc(l.name)}</div>
        <div class="price">${esc(formatCurrency(l.price))}</div>
        ${bc}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Narx yorliqlari</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: Arial, "Helvetica Neue", sans-serif; color: #000; background: #fff; }
    .sheet { display: flex; flex-wrap: wrap; gap: 2mm; padding: 4mm; }
    .label {
      width: ${w}mm; height: ${h}mm;
      border: 0.2mm solid #bbb;
      padding: 1.5mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; overflow: hidden;
      page-break-inside: avoid; break-inside: avoid;
    }
    .shop { font-size: 7pt; color: #444; line-height: 1.1; }
    .name {
      font-size: 8pt; font-weight: 600; line-height: 1.1;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .price { font-size: 14pt; font-weight: 800; margin: 0.5mm 0; }
    .bcwrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
    .bcwrap svg { max-width: 100%; }
    .bcval { font-size: 7pt; letter-spacing: 1px; margin-top: 0.3mm; }
    .nobc { font-size: 7pt; color: #666; }
    @media print {
      @page { margin: 6mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">${cells}</div>
</body>
</html>`;
}

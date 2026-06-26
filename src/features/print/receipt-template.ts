import { formatNumber, formatDateTimeFull } from "@/lib/format";
import type { ReceiptData, ReceiptLine } from "./types";

/**
 * 58mm termal chek HTML'i (sof funksiya — expo-print uchun). Inline CSS,
 * monospace. Summalar `formatNumber` ("2 450 000", so'msiz) bilan; jami qatorda
 * bir marta "so'm". ⚠️ cost_price chekka KIRITILMAYDI (tip ham ruxsat bermaydi).
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Uzun nomni 20 belgiga kesadi (miqdor + summa uchun joy qoldiradi). */
function truncateName(s: string): string {
  return s.length > 20 ? `${s.slice(0, 19)}…` : s;
}

function qtyLabel(line: ReceiptLine): string {
  return line.saleType === "weight" ? `${line.quantity.toFixed(3)} kg` : `×${line.quantity}`;
}

/** Chek # — uzun id'dan qisqa ko'rinish. */
function shortId(id: string): string {
  const clean = id.replace(/^offline-/, "");
  return clean.length > 8 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
}

export function buildReceiptHtml(data: ReceiptData): string {
  const rows = data.items
    .map(
      (l) => `<tr>
        <td class="nm">${esc(truncateName(l.name))} <span class="q">${qtyLabel(l)}</span></td>
        <td class="amt">${formatNumber(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const cashBlock =
    data.paymentMethod === "Naqd" && data.givenAmount != null
      ? `<div class="row"><span>Berilgan</span><span>${formatNumber(data.givenAmount)}</span></div>
         <div class="row"><span>Qaytim</span><span>${formatNumber(data.changeAmount ?? 0)}</span></div>`
      : "";

  const debtBlock =
    data.debtAmount != null && data.debtAmount > 0
      ? `<div class="row"><span>Nasiyaga</span><span>${formatNumber(data.debtAmount)}</span></div>
         ${data.customerName ? `<div class="row"><span>Mijoz</span><span>${esc(data.customerName)}</span></div>` : ""}`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { margin: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 58mm; margin: 0 auto; padding: 6px 8px; }
  .center { text-align: center; }
  .shop { font-size: 15px; font-weight: bold; }
  .muted { color: #333; font-size: 11px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .nm { word-break: break-word; }
  .q { color: #444; }
  .amt { text-align: right; white-space: nowrap; padding-left: 8px; }
  .row { display: flex; justify-content: space-between; }
  .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; }
  .foot { margin-top: 10px; }
</style></head>
<body>
  <div class="center shop">${esc(data.shopName)}</div>
  ${data.shopPhone ? `<div class="center muted">Tel: ${esc(data.shopPhone)}</div>` : ""}
  ${data.shopAddress ? `<div class="center muted">${esc(data.shopAddress)}</div>` : ""}
  <hr />
  <div class="muted">Chek #${shortId(data.saleId)}</div>
  <div class="muted">${formatDateTimeFull(data.soldAt)}</div>
  ${data.cashierName ? `<div class="muted">Kassir: ${esc(data.cashierName)}</div>` : ""}
  <hr />
  <table>${rows}</table>
  <hr />
  <div class="total"><span>JAMI</span><span>${formatNumber(data.totalRevenue)} so'm</span></div>
  <div class="row"><span>To'lov</span><span>${esc(data.paymentMethod)}</span></div>
  ${cashBlock}
  ${debtBlock}
  <hr />
  <div class="center foot">Rahmat! Xayrli kun!</div>
</body></html>`;
}

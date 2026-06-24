import type { SaleItem } from "@/types/database";

/** Qaytarish mumkin bo'lgan miqdor (sotilgan − allaqachon qaytarilgan). Sof funksiya. */
export function returnableQty(soldQty: number, alreadyReturned: number): number {
  return Math.max(0, soldQty - alreadyReturned);
}

/**
 * Tanlangan miqdorlar bo'yicha qaytariladigan jami summa (preview).
 * `qtys` — sale_item_id -> qaytariladigan miqdor (string yoki number).
 * Pulni tiyinda yaxlitlab float-driftni oldini olamiz (cart-total uslubi).
 */
export function refundPreview(
  items: SaleItem[],
  qtys: Record<string, string | number>
): number {
  let tiyin = 0;
  for (const it of items) {
    const q = Number(qtys[it.id]) || 0;
    if (q <= 0) continue;
    tiyin += Math.round(it.selling_price_snapshot * q * 100);
  }
  return tiyin / 100;
}

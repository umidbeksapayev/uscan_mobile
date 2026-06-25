/** Kirim jami summasi (Σ miqdor × tan narx) — tiyinda yaxlitlangan (float drift yo'q). */
export function supplyTotalCost(items: { quantity: number; costPrice: number }[]): number {
  let tiyin = 0;
  for (const it of items) tiyin += Math.round(it.quantity * it.costPrice * 100);
  return tiyin / 100;
}

/** Kirim qatorlari soni. */
export function supplyLineCount(items: unknown[]): number {
  return items.length;
}

/**
 * Pul va vazn formatlash.
 *
 * MUHIM: pul HAR DOIM `int` tiyinda saqlanadi/uzatiladi (float drift bo'lmasligi
 * uchun). Faqat ko'rsatishda so'mga aylantiriladi.
 * Vazn esa `int` gramda saqlanadi, ko'rsatishda kg (3 kasr).
 */

/** Raqamni bo'sh joy bilan minglik guruhlaydi: 2450000 -> "2 450 000" */
function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Tiyin (int) -> "2 450 000 so'm" */
export function formatCurrency(tiyin: number): string {
  const som = Math.round(tiyin) / 100;
  return `${groupThousands(som)} so'm`;
}

/** Tiyin (int) -> "2 450 000" (birliksiz) */
export function formatSom(tiyin: number): string {
  return groupThousands(Math.round(tiyin) / 100);
}

/** Gramm (int) -> "1.250 kg" */
export function formatWeight(grams: number): string {
  return `${(grams / 1000).toFixed(3)} kg`;
}

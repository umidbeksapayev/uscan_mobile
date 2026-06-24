/**
 * Pul va vazn formatlash — web lib/utils.ts ga MOS.
 * DB pulni DECIMAL "so'm"da saqlaydi (tiyin EMAS), vaznni DECIMAL "kg"da.
 * (Savat summasi F3/F4 da client'da tiyinda yaxlitlanadi — float drift uchun.)
 */

/** Minglik guruh (bo'sh joy): 2450000 -> "2 450 000" */
function group(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** so'm (DECIMAL) -> "2 450 000 so'm" */
export function formatCurrency(amount: number): string {
  return `${group(amount)} so'm`;
}

/** kg (DECIMAL) -> "1.250 kg" yoki "850 gramm" */
export function formatWeight(kg: number): string {
  if (kg >= 1) return `${kg.toFixed(3)} kg`;
  return `${Math.round(kg * 1000)} gramm`;
}

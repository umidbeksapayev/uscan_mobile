/**
 * VAZN sotuvi — so'm ⇄ kg ikki tomonlama hisob.
 * Misol: shakar 10 000 so'm/kg, mijoz 15 000 so'mlik oladi → 1.5 kg.
 */

/** so'm summadan kg (3 kasrgacha — DB DECIMAL(12,3) bilan mos). */
export function kgFromAmount(amount: number, pricePerKg: number): number {
  if (pricePerKg <= 0) return 0;
  return Math.round((amount / pricePerKg) * 1000) / 1000;
}

/** kg dan so'm summa (yaxlitlangan). */
export function amountFromKg(kg: number, pricePerKg: number): number {
  return Math.round(kg * pricePerKg);
}

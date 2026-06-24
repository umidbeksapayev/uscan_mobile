/** Qaytim = berilgan pul − jami. Manfiy bo'lsa — pul yetishmadi. */
export function changeAmount(given: number, total: number): number {
  return Math.round(given - total);
}

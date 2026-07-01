/**
 * Sotuv-qatorlarini mahsulot bo'yicha chastota (necha marta uchragani) bo'yicha
 * tartiblaydi — eng ko'pi birinchi. Sof funksiya (alohida faylda —
 * `frequent-products.ts` supabase client'ni import qiladi, bu esa Jest'da
 * native-modul xatosiga olib keladi).
 * Chastota (miqdor emas) ishlatiladi: bitta katta xarid bir necha kichik,
 * takroriy xariddan "tez-tez sotilgan" degan ma'noni yo'qqa chiqarmasligi kerak.
 */
export function rankByFrequency(rows: { product_id: string }[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

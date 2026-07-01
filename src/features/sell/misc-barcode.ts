import type { Product } from "@/types/database";

/**
 * Har bir do'kondagi "Boshqa tovar" (P9, tezkor narx) belgisi — haqiqiy
 * shtrix-kodlar har doim raqamli bo'lgani uchun bu qiymat ular bilan hech
 * qachon to'qnashmaydi. Sof konstanta/funksiya (alohida faylda —
 * `misc-product.ts` supabase client'ni import qiladi, bu esa Jest'da
 * native-modul xatosiga olib keladi).
 */
export const MISC_BARCODE = "__uscan_misc__";

export function isMiscProduct(product: Pick<Product, "barcode">): boolean {
  return product.barcode === MISC_BARCODE;
}

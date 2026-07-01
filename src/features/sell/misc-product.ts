import { supabase } from "@/lib/supabase";
import { createProduct, updateProduct } from "@/lib/products";
import { MISC_BARCODE } from "./misc-barcode";
import type { Product } from "@/types/database";

/**
 * Har bir do'kon uchun bitta "Boshqa tovar" — shtrix-kodsiz/katalogsiz tovarni
 * tezkor narx kiritib sotish uchun (P9).
 * ⚠️ Migratsiyasiz yechim — faqat `manage_products` ruxsati bor foydalanuvchiga
 * ochiq (narxni yangilash uchun RLS shu ruxsatni talab qiladi).
 */
const MISC_NAME = "Boshqa tovar";
const MISC_STARTING_QTY = 1_000_000;

const MISC_COLUMNS =
  "id, shop_id, name, sale_type, selling_price, quantity, low_stock_alert, barcode, image_url, category_id, is_active, created_at";

export { isMiscProduct } from "./misc-barcode";

/** Mavjud bo'lsa qaytaradi, bo'lmasa (shu do'konda birinchi marta) yaratadi. */
async function getOrCreateMiscProduct(shopId: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select(MISC_COLUMNS)
    .eq("shop_id", shopId)
    .eq("barcode", MISC_BARCODE)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as unknown as Product;

  return createProduct({
    shop_id: shopId,
    name: MISC_NAME,
    sale_type: "unit",
    cost_price: 0,
    selling_price: 0,
    quantity: MISC_STARTING_QTY,
    low_stock_alert: 0,
    barcode: MISC_BARCODE,
  });
}

/**
 * Kiritilgan narxga moslab, tezkor sotuv uchun mahsulotni tayyorlaydi.
 * ⚠️ Bitta umumiy qator — savatda bir vaqtda faqat bitta "Boshqa tovar" bo'lishi
 * mumkin (chaqiruvchi tomonda tekshiriladi), aks holda ikki xil narx bir xil
 * mahsulot id'ida to'qnashib, savat summasi noto'g'ri hisoblanadi.
 */
export async function priceMiscProduct(shopId: string, price: number): Promise<Product> {
  const product = await getOrCreateMiscProduct(shopId);
  if (product.selling_price === price) return product;
  return updateProduct(product.id, { selling_price: price });
}

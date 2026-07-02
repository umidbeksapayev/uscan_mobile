import { supabase } from "@/lib/supabase";
import type { ImportPayloadRow } from "./import-products";

export interface ImportResult {
  inserted: number;
  skipped: number;
  categories_created: number;
}

/** Do'kondagi mavjud (bo'sh bo'lmagan) barcode'lar — fayl-ichi dublikatni aniqlash uchun. */
export async function getExistingBarcodes(shopId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("products")
    .select("barcode")
    .eq("shop_id", shopId)
    .not("barcode", "is", null);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.barcode as string).filter(Boolean));
}

/**
 * `import_products` RPC — shared backend (web bilan bir xil, migration 018/024,
 * mobile uchun yangi migratsiya kerak emas). `manage_products` ruxsatini talab
 * qiladi, bir chaqiruvda 2000 tagacha qator, kategoriyani nom bo'yicha
 * topadi/yaratadi, do'kon-ichi barcode to'qnashuvini server tomonda ham chetlaydi.
 */
export async function importProducts(
  shopId: string,
  rows: ImportPayloadRow[],
): Promise<ImportResult> {
  const { data, error } = await supabase.rpc("import_products", {
    p_shop_id: shopId,
    p_rows: rows,
  });
  if (error) throw new Error(error.message);
  return data as ImportResult;
}

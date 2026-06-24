import { supabase } from "@/lib/supabase";
import { barcodeVariants } from "@/lib/barcode";
import type { Product } from "@/types/database";

/**
 * Barcode bo'yicha mahsulot(lar). Faqat faol va qoldig'i bor.
 * Variantlar (UPC/EAN) bilan qidiradi. Eng yangi 3 tagacha.
 */
export async function findProductsByBarcode(
  barcode: string,
  shopId: string,
): Promise<Product[]> {
  const variants = barcodeVariants(barcode);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("barcode", variants)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .gt("quantity", 0)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

/** Nom bo'yicha qidiruv (sotuv uchun — faqat qoldig'i bor mahsulotlar). */
export async function searchSellProducts(
  term: string,
  shopId: string,
): Promise<Product[]> {
  const t = term.trim();
  if (!t) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${t}%`)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .gt("quantity", 0)
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

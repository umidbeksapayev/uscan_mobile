import { supabase } from "@/lib/supabase";
import { barcodeVariants } from "@/lib/barcode";
import { isOnlineNow } from "@/lib/use-online";
import { findByBarcode, searchByName, upsertProducts } from "@/lib/offline/product-cache";
import type { Product } from "@/types/database";

/**
 * Sotuv lookup'i — online'da Supabase (+ keshni yangilash), offline yoki tarmoq
 * xatosida SQLite keshidan (graceful fallback).
 * ⚠️ `cost_price` ATALYABDAN tanlanmaydi (maxfiy; eski `select("*")` oqishi tuzatildi).
 */
const LOOKUP_COLUMNS =
  "id, shop_id, name, sale_type, selling_price, quantity, barcode, image_url, category_id, is_active, created_at";

/**
 * Barcode bo'yicha mahsulot(lar). Faqat faol va qoldig'i bor. Variantlar (UPC/EAN)
 * bilan qidiradi. Eng yangi 3 tagacha.
 */
export async function findProductsByBarcode(
  barcode: string,
  shopId: string,
): Promise<Product[]> {
  const variants = barcodeVariants(barcode);
  if (await isOnlineNow()) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(LOOKUP_COLUMNS)
        .in("barcode", variants)
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      void upsertProducts(rows).catch(() => {}); // keshni yangilash (fire-and-forget)
      return rows as unknown as Product[];
    } catch {
      return findByBarcode(shopId, variants); // tarmoq xatosi → kesh
    }
  }
  return findByBarcode(shopId, variants);
}

/** Nom bo'yicha qidiruv (sotuv uchun — faqat qoldig'i bor mahsulotlar). */
export async function searchSellProducts(
  term: string,
  shopId: string,
): Promise<Product[]> {
  const t = term.trim();
  if (!t) return [];
  if (await isOnlineNow()) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(LOOKUP_COLUMNS)
        .ilike("name", `%${t}%`)
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .gt("quantity", 0)
        .limit(10);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      void upsertProducts(rows).catch(() => {});
      return rows as unknown as Product[];
    } catch {
      return searchByName(shopId, t);
    }
  }
  return searchByName(shopId, t);
}

import { supabase } from "@/lib/supabase";
import { CATALOG_COLUMNS } from "@/features/catalog/use-products";
import { rankByFrequency } from "./rank-by-frequency";
import type { Product } from "@/types/database";

const LOOKBACK_DAYS = 30;
/** Bitta so'rovda o'qiladigan sotuv-qatorlari cheklovi — kichik do'kon uchun
 *  30 kunlik hajmni yopish uchun yetarli, aggregatsiya RPC/migratsiyasiz
 *  client'da bo'ladi. */
const SAMPLE_LIMIT = 500;

/**
 * Oxirgi {@link LOOKBACK_DAYS} kunda eng ko'p marta sotilgan mahsulot id'lari
 * (chastota bo'yicha, eng ko'pi birinchi). `get_top_products` RPC'dan farqli
 * o'laroq `view_reports` ruxsati talab qilinmaydi — `sale_items` a'zolar uchun
 * RLS orqali ochiq (tarix ekrani ham shu tarzda ishlaydi), shuning uchun har
 * qanday kassir ishlata oladi.
 */
export async function getFrequentProductIds(shopId: string, limit: number): Promise<string[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("sale_items")
    .select("product_id")
    .eq("shop_id", shopId)
    .gte("sold_at", since)
    .order("sold_at", { ascending: false })
    .limit(SAMPLE_LIMIT);
  if (error) throw new Error(error.message);

  return rankByFrequency((data ?? []) as { product_id: string }[], limit);
}

/** Berilgan id'lar bo'yicha faol, qoldig'i bor mahsulotlar (cost_price ataylab yo'q). */
export async function getProductsByIds(shopId: string, ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_COLUMNS)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .gt("quantity", 0)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Product[];
}

/** Chastota tartibida (eng ko'p sotilgani birinchi), o'chirilgan/nofaol
 *  mahsulotlarni chetlab, tez-tez sotiladigan mahsulotlar. */
export async function getFrequentProducts(shopId: string, limit = 8): Promise<Product[]> {
  const ids = await getFrequentProductIds(shopId, limit);
  if (ids.length === 0) return [];
  const products = await getProductsByIds(shopId, ids);
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

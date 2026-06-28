import { supabase } from "@/lib/supabase";
import type { DashboardStats, SalesTrendPoint, TopProduct, Product } from "@/types/database";

/** Bugungi tushum / foyda / sotuvlar soni + kam qoldiq soni. */
export async function getDashboardStats(shopId: string): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return data as DashboardStats;
}

/** Oxirgi N kun kunlik tushum/foyda trendi (bo'sh kunlar 0). */
export async function getSalesTrend(shopId: string, days = 7): Promise<SalesTrendPoint[]> {
  const { data, error } = await supabase.rpc("get_sales_trend", {
    p_shop_id: shopId,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesTrendPoint[];
}

/** Oxirgi N kun eng ko'p tushum keltirgan mahsulotlar. */
export async function getTopProducts(
  shopId: string,
  days = 30,
  limit = 5,
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc("get_top_products", {
    p_shop_id: shopId,
    p_days: days,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TopProduct[];
}

/**
 * Oxirgi N kun eng KAM sotilgan mahsulotlar (sotilmaganlar 0 bilan kiradi).
 * Migration 023 (`get_slow_products`) talab qiladi — agar hali ishga tushmagan
 * bo'lsa, "funksiya topilmadi" xatosini JIM o'tkazib bo'sh ro'yxat qaytaradi
 * (dashboard buzilmasligi uchun). Boshqa xatolar otiladi. (Web bilan bir xil.)
 */
export async function getSlowProducts(
  shopId: string,
  days = 30,
  limit = 5,
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc("get_slow_products", {
    p_shop_id: shopId,
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    const missing =
      error.code === "PGRST202" ||
      /could not find the function|does not exist/i.test(error.message);
    if (missing) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as TopProduct[];
}

/** Kam qoldiq mahsulot ustunlari — `cost_price` (MAXFIY) ataylab YO'Q
 *  (fallback yo'lida select("*") cost_price'ni oqizardi). */
const LOW_STOCK_COLUMNS =
  "id, shop_id, name, sale_type, selling_price, quantity, low_stock_alert, barcode, image_url, category_id, is_active, created_at";

/**
 * Kam qolgan mahsulotlar (quantity <= low_stock_alert) — FAOL do'kon.
 * ASOSIY: `get_low_stock_products` RPC (migration 031) — server filtrlaydi,
 * faqat kam qoldiqlar, cost_price'siz (butun katalog tortilmaydi).
 * FALLBACK: 031 hali ishga tushmagan bo'lsa — xavfsiz client so'rovi
 * (LOW_STOCK_COLUMNS, cost_price'siz) + client filtri. Shu bois maxfiylik
 * tuzatuvi migratsiyaga bog'liq emas — JS bilan darhol kuchga kiradi.
 */
export async function getLowStockProducts(shopId: string): Promise<Product[]> {
  const { data, error } = await supabase.rpc("get_low_stock_products", { p_shop_id: shopId });
  if (!error) return (data ?? []) as Product[];

  const missing =
    error.code === "PGRST202" ||
    /could not find the function|does not exist/i.test(error.message);
  if (!missing) throw new Error(error.message);

  // Migration 031 hali yo'q — xavfsiz client fallback (cost_price'siz).
  const fb = await supabase
    .from("products")
    .select(LOW_STOCK_COLUMNS)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("quantity", { ascending: true });
  if (fb.error) throw new Error(fb.error.message);
  return ((fb.data ?? []) as unknown as Product[]).filter((p) => p.quantity <= p.low_stock_alert);
}

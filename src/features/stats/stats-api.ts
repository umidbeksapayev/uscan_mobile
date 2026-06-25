import { supabase } from "@/lib/supabase";
import type { InventoryStats, SalesStats } from "@/types/database";

/** Ombor qiymati (DB'da hisoblanadi — RULE #1: client'da SUM yo'q). */
export async function getInventoryStats(shopId: string): Promise<InventoryStats> {
  const { data, error } = await supabase.rpc("get_inventory_stats", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return data as InventoryStats;
}

/** Davr savdo statistikasi (joriy + oldingi davr; view_reports talab qiladi). */
export async function getSalesStats(shopId: string, days: number): Promise<SalesStats> {
  const { data, error } = await supabase.rpc("get_sales_stats", {
    p_shop_id: shopId,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  return data as SalesStats;
}

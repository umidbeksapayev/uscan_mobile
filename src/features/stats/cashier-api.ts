import { supabase } from "@/lib/supabase";
import { periodStartIso } from "./period";
import type { CashierSaleRow } from "./cashier-math";

/**
 * Davr sotuvlari (kassir hisoboti uchun) — faqat kerakli 2 ustun.
 * RLS: sales SELECT barcha a'zoga ochiq, lekin bu ma'lumot faqat egaga
 * ko'rsatiladi (email'lar owner-gated list_shop_members RPC'dan keladi).
 * Export-csv kabi 2000 qator cheklovi (xotira/trafik himoyasi).
 */
export async function getCashierSales(shopId: string, days: number): Promise<CashierSaleRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("cashier_id, total_revenue")
    .eq("shop_id", shopId)
    .gte("sold_at", periodStartIso(days))
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as CashierSaleRow[];
}

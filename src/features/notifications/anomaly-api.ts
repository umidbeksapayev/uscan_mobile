import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useActiveShopId } from "@/features/auth/use-memberships";

export interface AnomalyStats {
  loss_sales_count: number;
  loss_sales_amount: number;
  returns_today: number;
  returns_spike: boolean;
  cash_shortfall_count: number;
  cash_shortfall_amount: number;
}

async function getShopAnomalies(shopId: string): Promise<AnomalyStats> {
  const { data, error } = await supabase.rpc("get_shop_anomalies", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return data as AnomalyStats;
}

/**
 * Qoidaga asoslangan anomaliya signallari (zararli sotuv, qaytarish
 * sakrashi, kassa kamomadi) — Gemini emas, migration 039 dagi oddiy SQL.
 * Faqat egasi (`enabled` orqali boshqariladi, RPC ham `is_shop_owner`
 * bilan himoyalangan).
 */
export function useAnomalies(enabled: boolean) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["anomalies", shopId],
    enabled: !!shopId && enabled,
    queryFn: () => getShopAnomalies(shopId!),
    staleTime: 15 * 60 * 1000,
  });
}

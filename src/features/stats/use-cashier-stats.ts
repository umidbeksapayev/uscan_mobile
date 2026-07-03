import { useQuery } from "@tanstack/react-query";

import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { getCashierSales } from "./cashier-api";
import { aggregateByCashier, type CashierAgg } from "./cashier-math";

/**
 * Kassir bo'yicha savdo (davr ichida) — FAQAT egaga (email'lar owner-gated
 * RPC'dan kelgani uchun; kassirlar bir-birining natijasini ko'rmasligi kerak).
 */
export function useCashierStats(days: number) {
  const shopId = useActiveShopId();
  const { isOwner } = useActivePermissions();
  return useQuery<CashierAgg[]>({
    queryKey: ["stats", "cashiers", shopId, days],
    enabled: !!shopId && isOwner,
    queryFn: async () => aggregateByCashier(await getCashierSales(shopId!, days)),
    staleTime: 30_000,
  });
}

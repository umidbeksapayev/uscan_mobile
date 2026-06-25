import { useQuery } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import {
  getDashboardStats,
  getSalesTrend,
  getTopProducts,
  getSlowProducts,
  getLowStockProducts,
} from "./dashboard-api";

/** Bugungi statistika (tushum/foyda/sotuv/kam qoldiq). */
export function useDashboardStats() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["dashboard", "stats", shopId],
    enabled: !!shopId,
    queryFn: () => getDashboardStats(shopId!),
    staleTime: 30_000,
  });
}

/** Kunlik tushum/foyda trendi (oxirgi N kun). */
export function useSalesTrend(days = 7) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["dashboard", "trend", shopId, days],
    enabled: !!shopId,
    queryFn: () => getSalesTrend(shopId!, days),
    staleTime: 30_000,
  });
}

/** Eng ko'p sotilgan mahsulotlar (oxirgi N kun). */
export function useTopProducts(days = 30, limit = 5) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["dashboard", "top", shopId, days, limit],
    enabled: !!shopId,
    queryFn: () => getTopProducts(shopId!, days, limit),
    staleTime: 60_000,
  });
}

/** Eng kam sotilgan mahsulotlar (oxirgi N kun). */
export function useSlowProducts(days = 30, limit = 5) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["dashboard", "slow", shopId, days, limit],
    enabled: !!shopId,
    queryFn: () => getSlowProducts(shopId!, days, limit),
    staleTime: 60_000,
  });
}

/** Kam qoldiq mahsulotlar. */
export function useLowStockProducts() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["dashboard", "low-stock", shopId],
    enabled: !!shopId,
    queryFn: () => getLowStockProducts(shopId!),
    staleTime: 30_000,
  });
}

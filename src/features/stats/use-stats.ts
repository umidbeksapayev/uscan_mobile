import { useQuery } from "@tanstack/react-query";

import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { getInventoryStats, getSalesStats } from "./stats-api";

/** Ombor qiymati — har a'zo o'qiy oladi (cost maydonlari serverda null bo'lishi mumkin). */
export function useInventoryStats() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["stats", "inventory", shopId],
    enabled: !!shopId,
    queryFn: () => getInventoryStats(shopId!),
    staleTime: 30_000,
  });
}

/**
 * Davr savdo statistikasi — FAQAT view_reports'li foydalanuvchida chaqiriladi
 * (aks holda RPC "Ruxsat yo'q" otadi; UI'da qulflangan holat ko'rsatamiz).
 */
export function useSalesStats(days: number) {
  const shopId = useActiveShopId();
  const { canViewReports } = useActivePermissions();
  return useQuery({
    queryKey: ["stats", "sales", shopId, days],
    enabled: !!shopId && canViewReports,
    queryFn: () => getSalesStats(shopId!, days),
    staleTime: 30_000,
  });
}

import { useQuery } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { getCashierReport } from "./cashier-report-api";
import type { CashierReportRow } from "./cashier-report-math";

/**
 * Kassir hisoboti.
 *
 * `useCashierStats` dan farqi: bu hook KASSIRGA HAM ochiq — u o'z natijasini
 * ko'radi. Filtrlash server tomonida (`get_cashier_report`), shuning uchun
 * bu yerda rol tekshiruvi yo'q: client'da gate qo'yish soxta xavfsizlik
 * bo'lardi, chunki RPC'ni baribir to'g'ridan-to'g'ri chaqirish mumkin.
 */
export function useCashierReport(days: number) {
  const shopId = useActiveShopId();

  return useQuery<CashierReportRow[]>({
    queryKey: ["stats", "cashier-report", shopId, days],
    enabled: !!shopId,
    queryFn: () => getCashierReport(shopId!, days),
    staleTime: 30_000,
  });
}

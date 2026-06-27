import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import {
  getSalesHistoryPage,
  getReturnedQuantities,
  processReturn,
  SALES_PAGE_SIZE,
  type ProcessReturnInput,
} from "./history-api";

/** Sotuv tarixi — FAOL do'kon bo'yicha, sahifa-sahifa (infinite scroll).
 *  Oxirgi sahifa to'liq bo'lmasa (< PAGE_SIZE) — keyingi sahifa yo'q. */
export function useSalesHistoryInfinite() {
  const shopId = useActiveShopId();
  return useInfiniteQuery({
    queryKey: ["sales", "history", shopId],
    enabled: !!shopId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getSalesHistoryPage(shopId!, pageParam, SALES_PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < SALES_PAGE_SIZE ? undefined : allPages.length * SALES_PAGE_SIZE,
    staleTime: 15_000,
  });
}

/** Sotuv bo'yicha allaqachon qaytarilgan miqdorlar (qaytarish limiti uchun). */
export function useReturnedQuantities(saleId: string | undefined) {
  return useQuery({
    queryKey: ["returns", "qty", saleId],
    queryFn: () => getReturnedQuantities(saleId!),
    enabled: !!saleId,
  });
}

export function useProcessReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProcessReturnInput) => processReturn(input),
    onSuccess: () => {
      // Inventar tiklandi, sotuv net qiymatlari va qaytarish holati o'zgardi
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["returns"] });
    },
  });
}

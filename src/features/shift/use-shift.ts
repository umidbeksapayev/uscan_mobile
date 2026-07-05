import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { getExpectedCash, closeCashShift, getCashClosures } from "./shift-api";

/** Kutilgan naqd — har ochilishda yangi (kassa jonli o'zgaradi, kesh eskiradi). */
export function useExpectedCash() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["expected-cash", shopId],
    enabled: !!shopId,
    queryFn: () => getExpectedCash(shopId!),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCloseShift() {
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  return useMutation({
    mutationFn: (input: { countedCash: number; note?: string | null }) =>
      closeCashShift({ shopId: shopId!, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expected-cash"] });
      qc.invalidateQueries({ queryKey: ["cash-closures"] });
    },
  });
}

export function useCashClosures() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["cash-closures", shopId],
    enabled: !!shopId,
    queryFn: () => getCashClosures(shopId!),
    staleTime: 30_000,
  });
}

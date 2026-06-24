import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSalesHistory,
  getReturnedQuantities,
  processReturn,
  type ProcessReturnInput,
} from "./history-api";

/** Sotuv tarixi (eng yangi N ta sotuv). */
export function useSalesHistory(limit = 50) {
  return useQuery({
    queryKey: ["sales", "history", limit],
    queryFn: () => getSalesHistory(limit),
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

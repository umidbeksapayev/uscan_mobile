import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  type SupplierInput,
} from "./suppliers-api";

export function useSuppliers() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["suppliers", shopId],
    enabled: !!shopId,
    queryFn: () => listSuppliers(shopId!),
    staleTime: 30_000,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => createSupplier(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Omit<SupplierInput, "shop_id">> }) =>
      updateSupplier(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

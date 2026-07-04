import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { periodStartIso } from "@/features/stats/period";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "./expenses-api";

/** Davr xarajatlari — faqat egasiga (RLS ham owner-only; kassirda so'rov yuborilmaydi). */
export function useExpenses(days: number) {
  const shopId = useActiveShopId();
  const { isOwner } = useActivePermissions();
  return useQuery({
    queryKey: ["expenses", shopId, days],
    enabled: !!shopId && isOwner,
    queryFn: () => listExpenses(shopId!, periodStartIso(days)),
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  return useMutation({
    mutationFn: (input: { amount: number; category: string; note?: string | null }) =>
      createExpense({ shop_id: shopId!, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; amount: number; category: string; note?: string | null }) =>
      updateExpense(args.id, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

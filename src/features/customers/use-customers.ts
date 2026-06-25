import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import type { CustomerPayment } from "@/types/database";
import {
  getCustomersWithBalance,
  getCustomer,
  getCustomerSales,
  getCustomerPayments,
  createCustomer,
  updateCustomer,
  recordPayment,
  type CustomerInput,
  type RecordPaymentInput,
} from "./customers-api";

/** Nasiya ro'yxati (balans bilan). */
export function useCustomersWithBalance() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["customers", shopId],
    enabled: !!shopId,
    queryFn: () => getCustomersWithBalance(shopId!),
    staleTime: 15_000,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: () => getCustomer(id!),
  });
}

export function useCustomerSales(id: string | undefined) {
  return useQuery({
    queryKey: ["customer-sales", id],
    enabled: !!id,
    queryFn: () => getCustomerSales(id!),
  });
}

export function useCustomerPayments(id: string | undefined) {
  return useQuery({
    queryKey: ["customer-payments", id],
    enabled: !!id,
    queryFn: () => getCustomerPayments(id!),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => createCustomer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Omit<CustomerInput, "shop_id">> }) =>
      updateCustomer(id, fields),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", vars.id] });
    },
  });
}

/** Qarz to'lash — optimistik: to'lov darhol cache'ga qo'shiladi (balans tezda yangilanadi). */
export function useRecordPayment(customerId: string) {
  const qc = useQueryClient();
  const key = ["customer-payments", customerId];
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordPayment(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<CustomerPayment[]>(key);
      const optimistic: CustomerPayment = {
        id: `optimistic-${Date.now()}`,
        shop_id: input.shopId,
        customer_id: customerId,
        amount: input.amount,
        paid_at: new Date().toISOString(),
        note: input.note ?? null,
      };
      qc.setQueryData<CustomerPayment[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

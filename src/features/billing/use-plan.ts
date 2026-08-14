import { useQuery } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { getActiveProductCount, getShopLimits, listPlans } from "./billing-api";

/**
 * Faol do'konning obuna holati — deyarli barcha ekranlarda kerak bo'lishi
 * mumkin (limit tekshiruvi, banner), shuning uchun 1 daqiqalik `staleTime`:
 * obuna holati soniyalar ichida o'zgarmaydi, keraksiz qayta so'rovlarni
 * oldini oladi.
 */
export function useShopPlan() {
  const shopId = useActiveShopId();

  return useQuery({
    queryKey: ["plan", shopId],
    queryFn: () => getShopLimits(shopId!),
    enabled: !!shopId,
    staleTime: 60_000,
  });
}

/** Tarif taqqoslash ro'yxati (`/subscription`) — deyarli statik. */
export function usePlansList() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: listPlans,
    staleTime: 60 * 60_000,
  });
}

/**
 * Katalog hisoblagichi uchun faol mahsulotlar soni. Kalit `["products", ...]`
 * prefiksi bilan boshlanadi — mahsulot qo'shilgach mavjud
 * `invalidateQueries({ queryKey: ["products"] })` chaqiruvlari buni ham
 * yangilaydi, alohida invalidatsiya yozish shart emas.
 */
export function useProductCount() {
  const shopId = useActiveShopId();

  return useQuery({
    queryKey: ["products", "count", shopId],
    queryFn: () => getActiveProductCount(shopId!),
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

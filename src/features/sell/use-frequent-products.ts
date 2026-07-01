import { useQuery } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { getFrequentProducts } from "./frequent-products";

/**
 * Tez-tez sotiladigan mahsulotlar (Sotuv ekranidagi tezkor tegish paneli).
 * Ixtiyoriy tezlashtirish — offline/xatoda jim muvaffaqiyatsiz bo'ladi
 * (panel shunchaki ko'rinmaydi), asosiy sotuv oqimini bloklamaydi.
 */
export function useFrequentProducts(limit = 8) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["frequent-products", shopId, limit],
    enabled: !!shopId,
    queryFn: () => getFrequentProducts(shopId!, limit),
    staleTime: 60_000,
    retry: false,
  });
}

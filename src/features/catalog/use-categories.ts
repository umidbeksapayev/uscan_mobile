import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useActiveShopId } from "@/features/auth/use-memberships";
import type { Category } from "@/types/database";

/** Do'kon kategoriyalari (chiplar uchun) — FAOL do'kon bo'yicha cheklangan. */
export function useCategories() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["categories", shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, shop_id, name, created_at")
        .eq("shop_id", shopId!)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Category[];
    },
  });
}

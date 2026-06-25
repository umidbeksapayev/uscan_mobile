import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useActiveShopId } from "@/features/auth/use-memberships";
import type { Product } from "@/types/database";

export type CategoryFilter = string | "all" | "none";

export interface ProductFilters {
  search?: string;
  categoryId?: CategoryFilter;
}

/**
 * Faol mahsulotlar — FAOL do'kon bo'yicha cheklangan (RLS a'zo bo'lgan barcha
 * do'konlarni qaytaradi, shuning uchun aniq shop_id filtri shart).
 * Web listProducts ga mos: ilike qidiruv + kategoriya filtri.
 */
export function useProducts(filters: ProductFilters) {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["products", shopId, filters.search?.trim() ?? "", filters.categoryId ?? "all"],
    enabled: !!shopId,
    queryFn: async (): Promise<Product[]> => {
      let q = supabase
        .from("products")
        .select("*, category:categories(name)")
        .eq("shop_id", shopId!)
        .eq("is_active", true);

      const search = filters.search?.trim();
      if (search) q = q.ilike("name", `%${search}%`);

      if (filters.categoryId && filters.categoryId !== "all") {
        q =
          filters.categoryId === "none"
            ? q.is("category_id", null)
            : q.eq("category_id", filters.categoryId);
      }

      q = q.order("name", { ascending: true });

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Product[];
    },
  });
}

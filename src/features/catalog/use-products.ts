import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";

export type CategoryFilter = string | "all" | "none";

export interface ProductFilters {
  search?: string;
  categoryId?: CategoryFilter;
}

/**
 * Faol mahsulotlar (RLS avtomatik shop_id bo'yicha filtrlaydi).
 * Web listProducts ga mos: ilike qidiruv + kategoriya filtri.
 */
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters.search?.trim() ?? "", filters.categoryId ?? "all"],
    queryFn: async (): Promise<Product[]> => {
      let q = supabase
        .from("products")
        .select("*, category:categories(name)")
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

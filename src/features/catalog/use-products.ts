import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { escapeLike } from "@/lib/escape-like";
import type { Product } from "@/types/database";

/**
 * Katalog uchun aniq ustunlar — `cost_price` (tan narxi, MAXFIY) ataylab YO'Q.
 * `select("*")` cost_price'ni kassir qurilmasiga yuborardi (UI yashirsa ham
 * React DevTools/tarmoqda ko'rinardi). Bu ro'yxat uni payload'dan butunlay olib
 * tashlaydi. (Foyda/tan narx faqat RPC'lar orqali, has_perm bilan.)
 */
export const CATALOG_COLUMNS =
  "id, shop_id, name, sale_type, selling_price, quantity, low_stock_alert, barcode, image_url, category_id, is_active, created_at, category:categories(name)";

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
        .select(CATALOG_COLUMNS)
        .eq("shop_id", shopId!)
        .eq("is_active", true);

      const search = filters.search?.trim();
      if (search) q = q.ilike("name", `%${escapeLike(search)}%`);

      if (filters.categoryId && filters.categoryId !== "all") {
        q =
          filters.categoryId === "none"
            ? q.is("category_id", null)
            : q.eq("category_id", filters.categoryId);
      }

      q = q.order("name", { ascending: true });

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      // cost_price ataylab tanlanmagan (maxfiy) — UI uni o'qimaydi. Codebase
      // idiomiga mos `unknown` orqali Product[] ga keltiramiz.
      return (data ?? []) as unknown as Product[];
    },
  });
}

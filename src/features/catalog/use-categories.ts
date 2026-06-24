import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database";

/** Do'kon kategoriyalari (chiplar uchun). RLS avtomatik shop_id. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, shop_id, name, created_at")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Category[];
    },
  });
}

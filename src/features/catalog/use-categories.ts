import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useActiveShopId } from "@/features/auth/use-memberships";
import type { Category } from "@/types/database";
import {
  listCategoriesWithCount,
  createCategory,
  renameCategory,
  deleteCategory,
} from "./categories-api";

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

/** Boshqaruv ekrani uchun — kategoriya + mahsulot soni. */
export function useCategoriesWithCount() {
  const shopId = useActiveShopId();
  return useQuery({
    queryKey: ["categories-count", shopId],
    enabled: !!shopId,
    queryFn: () => listCategoriesWithCount(shopId!),
  });
}

/** Kategoriya CRUD'idan keyin chiplar, sanoq va katalog (chip nomlari) yangilanadi. */
function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["categories-count"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
}

export function useCreateCategory() {
  const shopId = useActiveShopId();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (name: string) => createCategory(shopId!, name),
    onSuccess: invalidate,
  });
}

export function useRenameCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
  });
}

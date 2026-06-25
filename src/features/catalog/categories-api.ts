import { supabase } from "@/lib/supabase";
import type { Category, CategoryWithCount } from "@/types/database";

/**
 * Do'kon kategoriyalari + har biriga tegishli mahsulotlar soni (boshqaruv
 * ekrani uchun). RLS o'qishni a'zolik bo'yicha cheklaydi; shopId filtri
 * ko'p-do'konli foydalanuvchida faol do'konni ajratadi. (Web categories.ts mos.)
 */
export async function listCategoriesWithCount(shopId: string): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, shop_id, name, created_at, products(count)")
    .eq("shop_id", shopId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<
    Category & { products?: { count: number }[] }
  >).map((c) => ({
    id: c.id,
    shop_id: c.shop_id,
    name: c.name,
    created_at: c.created_at,
    // Supabase nested-count: products → [{ count: N }]
    product_count: Array.isArray(c.products) && c.products[0] ? c.products[0].count : 0,
  }));
}

export async function createCategory(shopId: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ shop_id: shopId, name: name.trim() })
    .select("id, shop_id, name, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Category;
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("id, shop_id, name, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Category;
}

/** O'chiradi; tegishli mahsulotlarning category_id → NULL (FK ON DELETE SET NULL). */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

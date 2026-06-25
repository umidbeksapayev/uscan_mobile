import { supabase } from "@/lib/supabase";
import type { Supplier } from "@/types/database";

/** Do'kon ta'minotchilari (FAOL do'kon — RLS has_perm 'purchase'). */
export async function listSuppliers(shopId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Supplier[];
}

export interface SupplierInput {
  shop_id: string;
  name: string;
  phone?: string | null;
  note?: string | null;
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      shop_id: input.shop_id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Supplier;
}

export async function updateSupplier(
  id: string,
  fields: Partial<Omit<SupplierInput, "shop_id">>,
): Promise<Supplier> {
  const patch: Record<string, unknown> = {};
  if (typeof fields.name === "string") patch.name = fields.name.trim();
  if ("phone" in fields) patch.phone = fields.phone?.trim() || null;
  if ("note" in fields) patch.note = fields.note?.trim() || null;

  const { data, error } = await supabase
    .from("suppliers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Supplier;
}

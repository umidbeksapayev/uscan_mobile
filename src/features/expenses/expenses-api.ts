import { supabase } from "@/lib/supabase";
import type { Expense } from "./expense-math";

export interface ExpenseInput {
  shop_id: string;
  amount: number;
  category: string;
  note?: string | null;
}

/** Davr xarajatlari (RLS: faqat egasi). 500 qator cheklovi — himoya. */
export async function listExpenses(shopId: string, sinceIso: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, category, note, spent_at")
    .eq("shop_id", shopId)
    .gte("spent_at", sinceIso)
    .order("spent_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Expense[];
}

export async function createExpense(input: ExpenseInput): Promise<void> {
  const { error } = await supabase.from("expenses").insert({
    shop_id: input.shop_id,
    amount: input.amount,
    category: input.category,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateExpense(
  id: string,
  fields: { amount: number; category: string; note?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update({ amount: fields.amount, category: fields.category, note: fields.note?.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

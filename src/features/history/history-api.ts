import { supabase } from "@/lib/supabase";
import type { Sale } from "@/types/database";

/** Sotuv tarixi — eng yangi sotuvlar (mahsulot nomi/rasmi + qaytarish qisqacha bilan).
 *  RLS avtomatik shop_id bo'yicha filtrlaydi. (Web getSalesHistory ga mos.) */
export async function getSalesHistory(limit = 50): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, items:sale_items(*, product:products(name, image_url, sale_type)), returns(id, total_refund)"
    )
    .order("sold_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

/** Sotuv bo'yicha har bir sale_item uchun allaqachon qaytarilgan jami miqdor.
 *  (return_items RLS = egasi; kassirda bo'sh qaytadi.) */
export async function getReturnedQuantities(
  saleId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("return_items")
    .select("sale_item_id, quantity")
    .eq("sale_id", saleId);
  if (error) throw new Error(error.message);

  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { sale_item_id: string; quantity: number }[]) {
    map[row.sale_item_id] = (map[row.sale_item_id] ?? 0) + row.quantity;
  }
  return map;
}

export interface ReturnLineInput {
  sale_item_id: string;
  quantity: number;
}

export interface ProcessReturnInput {
  shopId: string;
  saleId: string;
  items: ReturnLineInput[];
  reason?: string | null;
}

export interface ProcessReturnResult {
  return_id: string;
  total_refund: number;
  total_profit: number;
}

/** Sotuvni (to'liq/qisman) qaytarish — process_return RPC (atomar, inventar tiklanadi). */
export async function processReturn(
  input: ProcessReturnInput
): Promise<ProcessReturnResult> {
  const { data, error } = await supabase.rpc("process_return", {
    p_shop_id: input.shopId,
    p_sale_id: input.saleId,
    p_items: input.items,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return data as ProcessReturnResult;
}

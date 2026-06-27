import { supabase } from "@/lib/supabase";
import type { Sale } from "@/types/database";

/** Bir sahifadagi sotuvlar soni (infinite pagination). */
export const SALES_PAGE_SIZE = 30;

/** Sotuv tarixi sahifasi — eng yangi sotuvlar (mahsulot nomi/rasmi + qaytarish
 *  qisqacha bilan). FAOL do'kon bo'yicha cheklangan (RLS a'zo bo'lgan barcha
 *  do'konlarni qaytaradi). `offset` dan boshlab `limit` ta yozuv qaytaradi. */
export async function getSalesHistoryPage(
  shopId: string,
  offset: number,
  limit = SALES_PAGE_SIZE
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, items:sale_items(*, product:products(name, image_url, sale_type)), returns(id, total_refund)"
    )
    .eq("shop_id", shopId)
    .order("sold_at", { ascending: false })
    .range(offset, offset + limit - 1);

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

import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";

/** Kirim uchun mahsulot qidirish — nom yoki shtrix-kod; QOLDIQ shart EMAS
 *  (0 qoldiqli mahsulotni ham to'ldirish mumkin). Faqat faol mahsulotlar. */
export async function searchSupplyProducts(term: string, shopId: string): Promise<Product[]> {
  const t = term.trim();
  if (!t) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .or(`name.ilike.%${t}%,barcode.ilike.%${t}%`)
    .order("name", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export interface PurchaseLine {
  product_id: string;
  quantity: number;
  cost_price: number;
}

export interface ProcessPurchaseInput {
  shopId: string;
  supplierId: string | null;
  items: PurchaseLine[];
  note?: string | null;
}

export interface PurchaseResult {
  purchase_id: string;
  total: number;
}

/** Kirimni atomar saqlash (process_purchase RPC: inventar↑ + tan narx
 *  o'rtacha (weighted average) yangilanadi). */
export async function processPurchase(input: ProcessPurchaseInput): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc("process_purchase", {
    p_shop_id: input.shopId,
    p_supplier_id: input.supplierId,
    p_items: input.items,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as PurchaseResult;
}

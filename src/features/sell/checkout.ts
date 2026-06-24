import { supabase } from "@/lib/supabase";
import type { CartItem } from "./cart-store";

export type PaymentMethod = "cash" | "card" | "qr" | "debt";

export interface SaleResult {
  sale_id: string;
  item_count: number;
  total_revenue: number;
  total_profit: number;
  paid_amount: number;
  debt: number;
}

/**
 * Savatni atomar sotadi (process_sale_cart RPC — web sales.ts ga mos).
 * client_id idempotency: bir xil id bilan ikki marta yuborilsa, ikki marta
 * yozilmaydi (migration 019).
 */
export async function processCartSale(params: {
  shopId: string;
  items: CartItem[];
  clientId: string;
  customerId?: string | null;
  paidAmount?: number | null;
}): Promise<SaleResult> {
  const { shopId, items, clientId, customerId = null, paidAmount = null } = params;
  const payload = items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));

  const { data, error } = await supabase.rpc("process_sale_cart", {
    p_shop_id: shopId,
    p_items: payload,
    p_search_method: "manual",
    p_customer_id: customerId,
    p_paid_amount: paidAmount,
    p_client_id: clientId,
  });

  if (error) throw new Error(error.message);
  return data as SaleResult;
}

import { supabase } from "@/lib/supabase";

export interface SaleResult {
  sale_id: string;
  item_count: number;
  total_revenue: number;
  total_profit: number;
  paid_amount: number;
  debt: number;
  /** 019: replay'da mavjud sotuv qaytarilsa true. */
  duplicate?: boolean;
  /** Offline navbatga saqlangani (server hali bilmaydi). */
  offline?: boolean;
}

export interface SalePayloadItem {
  product_id: string;
  quantity: number;
}

/**
 * Xom RPC chaqiruvi (process_sale_cart). Online sotuv (`features/sell/checkout.ts`)
 * VA offline replay (`lib/offline/sync.ts`) ikkalasi ham shu funksiyani ishlatadi —
 * shuning uchun feature-agnostik `lib/`da (ikkala tomon ham bir-biriga qaram
 * bo'lmasligi uchun). client_id idempotency (019) — dublikat yozilmaydi.
 */
export async function processSaleRpc(params: {
  shopId: string;
  items: SalePayloadItem[];
  clientId: string;
  customerId?: string | null;
  paidAmount?: number | null;
}): Promise<SaleResult> {
  const { shopId, items, clientId, customerId = null, paidAmount = null } = params;
  const { data, error } = await supabase.rpc("process_sale_cart", {
    p_shop_id: shopId,
    p_items: items,
    p_search_method: "manual",
    p_customer_id: customerId,
    p_paid_amount: paidAmount,
    p_client_id: clientId,
  });
  if (error) throw new Error(error.message);
  return data as SaleResult;
}

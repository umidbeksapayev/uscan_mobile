import { isOnlineNow } from "@/lib/use-online";
import { decrementLocalQty } from "@/lib/offline/product-cache";
import { enqueueSale } from "@/lib/offline/sale-queue-db";
import { classifySaleError } from "@/lib/offline/sync-math";
import { processSaleRpc, type SaleResult, type SalePayloadItem } from "@/lib/sale-rpc";
import type { CartItem } from "./cart-store";
import { cartTotal } from "./cart-total";

export type PaymentMethod = "cash" | "card" | "qr" | "debt";
export type { SaleResult, SalePayloadItem };

/**
 * Yuqori darajadagi sotuv: online → RPC + lokal qoldiqni optimistik kamaytirish;
 * offline yoki tarmoq xatosi → navbatga yozish (idempotent client_id) + optimistik
 * kamaytirish + sintetik natija ("ulanganda yuboriladi").
 */
export async function submitSale(params: {
  shopId: string;
  items: CartItem[];
  clientId: string;
  method: PaymentMethod;
  customerId?: string | null;
  paidAmount?: number | null;
}): Promise<SaleResult> {
  const { shopId, items, clientId, method, customerId = null, paidAmount = null } = params;
  const payload: SalePayloadItem[] = items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));

  const decrementLocal = async () => {
    for (const i of items) {
      await decrementLocalQty(shopId, i.product.id, i.quantity).catch(() => {});
    }
  };

  if (await isOnlineNow()) {
    try {
      const res = await processSaleRpc({ shopId, items: payload, clientId, customerId, paidAmount });
      await decrementLocal();
      return res;
    } catch (e) {
      // Tarmoq xatosi → navbatga (sotuv yo'qolmasin). Boshqa xato → uloqtir.
      if (classifySaleError(e) !== "network") throw e;
    }
  }

  // Offline yoki tarmoq xatosi → navbatga saqlash
  await enqueueSale({
    client_id: clientId,
    shop_id: shopId,
    items: payload,
    customer_id: customerId,
    paid_amount: paidAmount,
    method,
    status: "pending",
    error: null,
    attempt: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await decrementLocal();

  const total = cartTotal(items);
  const paid = paidAmount != null ? paidAmount : total;
  return {
    sale_id: `offline-${clientId}`,
    item_count: items.length,
    total_revenue: total,
    total_profit: 0, // offline — maxfiy, server hisoblaydi
    paid_amount: paid,
    debt: Math.max(0, total - paid),
    offline: true,
  };
}

/**
 * Sotuv navbati — SOF holat mantiqi (DB'siz, alohida test qilinadi).
 * Persistensiya (SQLite) `sale-queue-db.ts` da; bu fayl faqat o'tish qoidalari.
 */

export type SaleStatus = "pending" | "syncing" | "done" | "failed";

export interface QueuedSale {
  client_id: string; // = RPC p_client_id (idempotency)
  shop_id: string;
  items: { product_id: string; quantity: number }[];
  customer_id: string | null;
  paid_amount: number | null;
  method: string | null; // faqat UI/log uchun
  status: SaleStatus;
  error: string | null;
  attempt: number;
  created_at: string;
  updated_at: string;
}

export const MAX_ATTEMPTS = 5;

/** Dublikat client_id qo'shilmaydi (idempotent). */
export function enqueue(list: QueuedSale[], sale: QueuedSale): QueuedSale[] {
  if (list.some((s) => s.client_id === sale.client_id)) return list;
  return [...list, { ...sale, status: "pending" }];
}

export function remove(list: QueuedSale[], clientId: string): QueuedSale[] {
  return list.filter((s) => s.client_id !== clientId);
}

function patch(
  list: QueuedSale[],
  clientId: string,
  fields: Partial<QueuedSale>,
): QueuedSale[] {
  return list.map((s) => (s.client_id === clientId ? { ...s, ...fields } : s));
}

export function markSyncing(list: QueuedSale[], clientId: string): QueuedSale[] {
  return patch(list, clientId, { status: "syncing", error: null });
}

export function markDone(list: QueuedSale[], clientId: string): QueuedSale[] {
  return patch(list, clientId, { status: "done" });
}

export function markFailed(list: QueuedSale[], clientId: string, error: string): QueuedSale[] {
  return patch(list, clientId, { status: "failed", error });
}

/** Urinish +1; MAX_ATTEMPTS ga yetса/oshса → failed. */
export function incrementAttempt(
  list: QueuedSale[],
  clientId: string,
  max: number = MAX_ATTEMPTS,
): QueuedSale[] {
  return list.map((s) => {
    if (s.client_id !== clientId) return s;
    const attempt = s.attempt + 1;
    const status: SaleStatus = attempt >= max ? "failed" : s.status;
    return { ...s, attempt, status };
  });
}

export function pendingItems(list: QueuedSale[]): QueuedSale[] {
  return list.filter((s) => s.status === "pending");
}

export function pendingCount(list: QueuedSale[]): number {
  return pendingItems(list).length;
}

export function failedItems(list: QueuedSale[]): QueuedSale[] {
  return list.filter((s) => s.status === "failed");
}

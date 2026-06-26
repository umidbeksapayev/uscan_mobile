import { processSaleRpc } from "@/features/sell/checkout";
import { incrementLocalQty } from "./product-cache";
import { classifySaleError } from "./sync-math";
import { MAX_ATTEMPTS } from "./sale-queue";
import { meta, MetaKeys } from "./mmkv";
import {
  loadPending,
  setStatus,
  bumpAttempt,
  removeSale,
  resetForRetry,
  unsyncedCount,
} from "./sale-queue-db";

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
  remaining: number;
}

/**
 * Navbatni SERIAL drenaj (har sotuv inventarni kamaytiradi → parallel emas).
 * MMKV `syncRunning` mutex bilan bir vaqtda bitta drain. client_id idempotency
 * (019) tufayli qayta yuborish xavfsiz.
 */
export async function syncQueue(shopId: string): Promise<SyncResult> {
  const empty: SyncResult = { synced: 0, conflicts: 0, failed: 0, remaining: 0 };
  if (!shopId) return empty;
  if (meta.getBool(MetaKeys.syncRunning)) {
    return { ...empty, remaining: meta.getNumber(MetaKeys.queueCount) };
  }
  meta.setBool(MetaKeys.syncRunning, true);

  let synced = 0;
  let conflicts = 0;
  let failed = 0;
  try {
    const pending = await loadPending(shopId);
    for (const sale of pending) {
      await setStatus(sale.client_id, "syncing");
      const attempt = await bumpAttempt(sale.client_id);
      try {
        await processSaleRpc({
          shopId,
          items: sale.items,
          clientId: sale.client_id,
          customerId: sale.customer_id,
          paidAmount: sale.paid_amount,
        });
        await removeSale(sale.client_id); // 'done' saqlanmaydi
        synced++;
      } catch (e) {
        const kind = classifySaleError(e);
        const msg = e instanceof Error ? e.message : "Xatolik";
        if (kind === "network") {
          await setStatus(sale.client_id, "pending"); // keyinroq
          break; // drain'ni to'xtatamiz (hali tarmoq yo'q)
        }
        if (kind === "already_done") {
          await removeSale(sale.client_id); // server allaqachon yozgan (idempotent)
          synced++;
          continue;
        }
        if (kind === "conflict") {
          await setStatus(sale.client_id, "failed", msg);
          // Sotuv amalga oshmadi → optimistik qoldiqni ROLLBACK
          for (const it of sale.items) {
            await incrementLocalQty(shopId, it.product_id, it.quantity).catch(() => {});
          }
          conflicts++;
          continue;
        }
        // unknown
        if (attempt >= MAX_ATTEMPTS) {
          await setStatus(sale.client_id, "failed", msg);
          failed++;
        } else {
          await setStatus(sale.client_id, "pending", msg);
        }
      }
    }
  } finally {
    meta.setBool(MetaKeys.syncRunning, false);
    const remaining = await unsyncedCount(shopId).catch(() => 0);
    meta.setNumber(MetaKeys.queueCount, remaining);
  }

  return { synced, conflicts, failed, remaining: meta.getNumber(MetaKeys.queueCount) };
}

/** Failed sotuvni qayta urinishga qo'yib, darrov sync boshlash. */
export async function retrySale(shopId: string, clientId: string): Promise<SyncResult> {
  await resetForRetry(clientId);
  return syncQueue(shopId);
}

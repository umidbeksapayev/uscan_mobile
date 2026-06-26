import { getAllAsync, runAsync } from "./db";
import type { QueuedSale, SaleStatus } from "./sale-queue";

/**
 * Sotuv navbati persistensiyasi (SQLite). Sof o'tish mantiqi `sale-queue.ts` da;
 * bu yerda faqat IO (load/insert/update/delete). 'done' o'chiriladi (saqlanmaydi).
 */
interface SaleRow {
  client_id: string;
  shop_id: string;
  items_json: string;
  customer_id: string | null;
  paid_amount: number | null;
  method: string | null;
  status: string;
  error: string | null;
  attempt: number;
  created_at: string;
  updated_at: string;
}

function rowToSale(r: SaleRow): QueuedSale {
  let items: QueuedSale["items"] = [];
  try {
    items = JSON.parse(r.items_json) as QueuedSale["items"];
  } catch {
    items = [];
  }
  return {
    client_id: r.client_id,
    shop_id: r.shop_id,
    items,
    customer_id: r.customer_id,
    paid_amount: r.paid_amount,
    method: r.method,
    status: r.status as SaleStatus,
    error: r.error,
    attempt: r.attempt,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function enqueueSale(sale: QueuedSale): Promise<void> {
  await runAsync(
    `INSERT OR IGNORE INTO sale_queue
      (client_id, shop_id, items_json, customer_id, paid_amount, method, status, error, attempt, created_at, updated_at)
     VALUES (?,?,?,?,?,?, 'pending', NULL, 0, ?, ?)`,
    [
      sale.client_id, sale.shop_id, JSON.stringify(sale.items), sale.customer_id,
      sale.paid_amount, sale.method, sale.created_at, sale.updated_at,
    ],
  );
}

export async function loadQueue(shopId: string): Promise<QueuedSale[]> {
  const rows = await getAllAsync<SaleRow>(
    `SELECT * FROM sale_queue WHERE shop_id=? ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(rowToSale);
}

/** Yuborilishi kerak bo'lganlar (pending + osilib qolgan syncing). */
export async function loadPending(shopId: string): Promise<QueuedSale[]> {
  const rows = await getAllAsync<SaleRow>(
    `SELECT * FROM sale_queue WHERE shop_id=? AND status IN ('pending','syncing') ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(rowToSale);
}

export async function loadFailed(shopId: string): Promise<QueuedSale[]> {
  const rows = await getAllAsync<SaleRow>(
    `SELECT * FROM sale_queue WHERE shop_id=? AND status='failed' ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(rowToSale);
}

export async function setStatus(clientId: string, status: SaleStatus, error: string | null = null): Promise<void> {
  await runAsync(
    `UPDATE sale_queue SET status=?, error=?, updated_at=? WHERE client_id=?`,
    [status, error, new Date().toISOString(), clientId],
  );
}

/** Urinish +1 → yangi attempt qiymatini qaytaradi. */
export async function bumpAttempt(clientId: string): Promise<number> {
  await runAsync(
    `UPDATE sale_queue SET attempt = attempt + 1, updated_at=? WHERE client_id=?`,
    [new Date().toISOString(), clientId],
  );
  const rows = await getAllAsync<{ attempt: number }>(
    `SELECT attempt FROM sale_queue WHERE client_id=?`,
    [clientId],
  );
  return rows[0]?.attempt ?? 0;
}

export async function removeSale(clientId: string): Promise<void> {
  await runAsync(`DELETE FROM sale_queue WHERE client_id=?`, [clientId]);
}

/** Failed sotuvni qayta urinishga qo'yish (status=pending, attempt=0, error tozalanadi). */
export async function resetForRetry(clientId: string): Promise<void> {
  await runAsync(
    `UPDATE sale_queue SET status='pending', attempt=0, error=NULL, updated_at=? WHERE client_id=?`,
    [new Date().toISOString(), clientId],
  );
}

/** Yuborilmagan sotuvlar soni (pending+syncing+failed; done o'chirilgan). */
export async function unsyncedCount(shopId: string): Promise<number> {
  const rows = await getAllAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sale_queue WHERE shop_id=?`,
    [shopId],
  );
  return rows[0]?.n ?? 0;
}

import { getAllAsync, runAsync } from "@/lib/offline/db";
import type { PrintErrorKind } from "./printer-state";
import type { PrinterKind } from "./transport";
import {
  INTERRUPTED_ERROR,
  PRINTED_RETENTION_DAYS,
  type PrintJob,
  type PrintJobKind,
  type PrintJobStatus,
} from "./print-queue";

/**
 * Chop etish navbati persistensiyasi (SQLite `print_queue`). Faqat IO —
 * qarorlar `print-queue.ts` da, bajarish `print-queue-runner.ts` da.
 * `sale-queue-db.ts` bilan bir xil naqsh.
 */

interface JobRow {
  job_id: string;
  shop_id: string;
  kind: string;
  payload_json: string;
  target_kind: string;
  title: string;
  status: string;
  error: string | null;
  error_kind: string | null;
  attempt: number;
  created_at: string;
  updated_at: string;
}

function rowToJob(r: JobRow): PrintJob {
  return {
    job_id: r.job_id,
    shop_id: r.shop_id,
    kind: r.kind as PrintJobKind,
    payload_json: r.payload_json,
    target_kind: r.target_kind as PrinterKind,
    title: r.title,
    status: r.status as PrintJobStatus,
    error: r.error,
    error_kind: (r.error_kind as PrintErrorKind | null) ?? null,
    attempt: r.attempt,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export interface NewPrintJob {
  job_id: string;
  shop_id: string;
  kind: PrintJobKind;
  payload_json: string;
  target_kind: PrinterKind;
  title: string;
}

/**
 * Ishni navbatga qo'yadi.
 *
 * `INSERT OR IGNORE` — DUBLIKAT HIMOYASI shu yerda: bir xil `job_id` ikkinchi
 * marta kelsa qator yozilmaydi. Qaytadigan qiymat "yangi ish yaratildimi".
 */
export async function enqueueJob(job: NewPrintJob): Promise<boolean> {
  const now = new Date().toISOString();
  const res = await runAsync(
    `INSERT OR IGNORE INTO print_queue
      (job_id, shop_id, kind, payload_json, target_kind, title, status, error, error_kind, attempt, created_at, updated_at)
     VALUES (?,?,?,?,?,?, 'pending', NULL, NULL, 0, ?, ?)`,
    [job.job_id, job.shop_id, job.kind, job.payload_json, job.target_kind, job.title, now, now],
  );
  return res.changes > 0;
}

export async function getJob(jobId: string): Promise<PrintJob | null> {
  const rows = await getAllAsync<JobRow>(`SELECT * FROM print_queue WHERE job_id=?`, [jobId]);
  return rows[0] ? rowToJob(rows[0]) : null;
}

/** Yuborilishi kerak bo'lganlar — eng eskisi birinchi (chek tartibi muhim). */
export async function loadPendingJobs(shopId: string): Promise<PrintJob[]> {
  const rows = await getAllAsync<JobRow>(
    `SELECT * FROM print_queue WHERE shop_id=? AND status='pending' ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(rowToJob);
}

/** Chiqmay qolganlar — navbat ekranida ko'rsatiladi. */
export async function loadFailedJobs(shopId: string): Promise<PrintJob[]> {
  const rows = await getAllAsync<JobRow>(
    `SELECT * FROM print_queue WHERE shop_id=? AND status='failed' ORDER BY created_at DESC`,
    [shopId],
  );
  return rows.map(rowToJob);
}

export async function setJobStatus(
  jobId: string,
  status: PrintJobStatus,
  error: string | null = null,
  errorKind: PrintErrorKind | null = null,
): Promise<void> {
  await runAsync(
    `UPDATE print_queue SET status=?, error=?, error_kind=?, updated_at=? WHERE job_id=?`,
    [status, error, errorKind, new Date().toISOString(), jobId],
  );
}

/** Urinish +1 → yangi qiymat. */
export async function bumpJobAttempt(jobId: string): Promise<number> {
  await runAsync(`UPDATE print_queue SET attempt = attempt + 1, updated_at=? WHERE job_id=?`, [
    new Date().toISOString(),
    jobId,
  ]);
  const rows = await getAllAsync<{ attempt: number }>(
    `SELECT attempt FROM print_queue WHERE job_id=?`,
    [jobId],
  );
  return rows[0]?.attempt ?? 0;
}

/** Chiqmay qolgan ishni qayta urinishga qo'yish (foydalanuvchi bosgan). */
export async function resetJobForRetry(jobId: string): Promise<void> {
  await runAsync(
    `UPDATE print_queue SET status='pending', attempt=0, error=NULL, error_kind=NULL, updated_at=? WHERE job_id=?`,
    [new Date().toISOString(), jobId],
  );
}

export async function removeJob(jobId: string): Promise<void> {
  await runAsync(`DELETE FROM print_queue WHERE job_id=?`, [jobId]);
}

/** Chiqmay qolgan cheklar soni — sozlama ekranidagi belgi uchun. */
export async function pendingJobCount(shopId: string): Promise<number> {
  const rows = await getAllAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM print_queue WHERE shop_id=? AND status IN ('pending','failed')`,
    [shopId],
  );
  return rows[0]?.n ?? 0;
}

/**
 * Ilova ishga tushganda navbatni tiklaydi. Ikki ish qiladi:
 *
 * 1. `printing` da qolib ketganlar → `failed`. Ular `pending` ga QAYTARILMAYDI:
 *    chek chiqdimi yoki yo'qmi noma'lum, avtomatik qayta chiqarish esa kassir
 *    kutmagan ikkinchi chekni bermasligi kerak. Foydalanuvchi o'zi qaror qiladi.
 * 2. Eski `printed` yozuvlarni tozalaydi — ular faqat dublikat himoyasi uchun
 *    saqlanadi va abadiy o'smasligi kerak.
 */
export async function recoverPrintQueue(): Promise<void> {
  const now = new Date().toISOString();
  await runAsync(
    `UPDATE print_queue SET status='failed', error=?, error_kind='unknown', updated_at=? WHERE status='printing'`,
    [INTERRUPTED_ERROR, now],
  );
  const cutoff = new Date(Date.now() - PRINTED_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await runAsync(`DELETE FROM print_queue WHERE status='printed' AND updated_at < ?`, [cutoff]);
}

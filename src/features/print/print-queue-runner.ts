import { logError } from "@/lib/logger";

import { documentFor, documentFromJob } from "./documents";
import { printDocument } from "./printer-manager";
import { printerTarget } from "./printer-settings";
import { shouldRetryJob, type PrintJob } from "./print-queue";
import type { PrintDocument } from "./transport";
import type { PrintErrorKind } from "./printer-state";
import {
  bumpJobAttempt,
  enqueueJob,
  getJob,
  loadPendingJobs,
  pendingJobCount,
  removeJob,
  setJobStatus,
  type NewPrintJob,
} from "./print-queue-db";

/**
 * Navbatni bajaruvchi. Qarorlar `print-queue.ts` da (sof), IO
 * `print-queue-db.ts` da, apparat esa `printer-manager.ts` da.
 *
 * ⚠️ Ikki qatlamli qayta urinish ATAYLAB:
 *  - MENEJER bitta chaqiruv ichida 3 marta uradi (bir necha soniya) — uxlab
 *    qolgan yoki bir lahzaga uzilgan printer uchun;
 *  - NAVBAT esa vaqt bo'ylab qayta uradi (ilova old planga chiqqanda, printer
 *    qayta ulanganda, foydalanuvchi bosganda) — printer o'chirilgan holat uchun.
 * Navbat xatodan keyin DARHOL qayta urinmaydi, shuning uchun 3×3 = 9 urinish
 * ketma-ket ketmaydi.
 */

export type SubmitResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; kind: PrintErrorKind; message: string; queued: boolean };

export interface DrainResult {
  printed: number;
  failed: number;
  remaining: number;
}

/** Bir vaqtda bitta drenaj — ortiqcha IO va ikki marta status yozishni to'sadi. */
let draining = false;

/** Bitta ishni bajaradi va navbatdagi holatini yangilaydi. */
async function runJob(jobId: string, doc: PrintDocument): Promise<SubmitResult> {
  await setJobStatus(jobId, "printing");
  const attempt = await bumpJobAttempt(jobId);

  const outcome = await printDocument(doc, printerTarget());
  if (outcome.ok) {
    // O'CHIRILMAYDI: `printed` qatori dublikat himoyasi sifatida qoladi (bir xil
    // job_id qayta kelsa `INSERT OR IGNORE` uni to'sadi). Eskilari
    // `recoverPrintQueue()` da tozalanadi.
    await setJobStatus(jobId, "printed");
    return { ok: true, duplicate: false };
  }

  const retry = shouldRetryJob(attempt, outcome.kind);
  await setJobStatus(jobId, retry ? "pending" : "failed", outcome.message, outcome.kind);
  return { ok: false, kind: outcome.kind, message: outcome.message, queued: retry };
}

/** Payload buzilgan ish — qayta urinish yordam bermaydi, darhol `failed`. */
async function failBadPayload(jobId: string, e: unknown): Promise<SubmitResult> {
  logError("print.queue.payload", e);
  const message = "Chek ma'lumoti buzilgan";
  await setJobStatus(jobId, "failed", message, "unknown");
  return { ok: false, kind: "unknown", message, queued: false };
}

/**
 * Ishni navbatga qo'yadi va DARHOL bajarishga urinadi.
 *
 * Bir xil `job_id` allaqachon chiqarilgan bo'lsa hech narsa qilmaydi va
 * `duplicate: true` qaytaradi — "Chek" tugmasini ikki marta bosish shu yerda
 * to'siladi (P1-5).
 */
export async function submitPrintJob(job: NewPrintJob): Promise<SubmitResult> {
  const isNew = await enqueueJob(job);

  if (!isNew) {
    const existing = await getJob(job.job_id);
    if (existing?.status === "printed") return { ok: true, duplicate: true };
    if (existing?.status === "printing") {
      return { ok: false, kind: "unknown", message: "Chek chiqarilmoqda", queued: true };
    }
    // pending/failed — foydalanuvchi qayta urinmoqda, davom etamiz.
  }

  let doc: PrintDocument;
  try {
    doc = documentFor(job.kind, job.payload_json);
  } catch (e) {
    return failBadPayload(job.job_id, e);
  }
  return runJob(job.job_id, doc);
}

/**
 * Kutayotgan ishlarni ketma-ket chiqaradi. Aloqa xatosida drenaj TO'XTAYDI —
 * printer o'chiq bo'lsa qolganini urinish faqat kutish vaqtini uzaytiradi
 * (`sync.ts` dagi bir xil qaror).
 */
export async function drainPrintQueue(shopId: string): Promise<DrainResult> {
  if (!shopId || draining) return { printed: 0, failed: 0, remaining: 0 };
  draining = true;

  let printed = 0;
  let failed = 0;
  try {
    const jobs: PrintJob[] = await loadPendingJobs(shopId);
    for (const job of jobs) {
      let doc: PrintDocument;
      try {
        doc = documentFromJob(job);
      } catch (e) {
        await failBadPayload(job.job_id, e);
        failed++;
        continue;
      }
      const res = await runJob(job.job_id, doc);
      if (res.ok) {
        printed++;
        continue;
      }
      failed++;
      if (res.kind === "connection") break; // printer yo'q — qolganini urinmaymiz
    }
  } catch (e) {
    logError("print.queue.drain", e);
  } finally {
    draining = false;
  }

  const remaining = await pendingJobCount(shopId).catch((e) => {
    logError("print.queue.count", e);
    return 0;
  });
  return { printed, failed, remaining };
}

/** Foydalanuvchi navbatdagi ishni o'chirdi (chek endi kerak emas). */
export async function discardJob(jobId: string): Promise<void> {
  await removeJob(jobId);
}

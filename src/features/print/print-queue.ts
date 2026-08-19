import type { PrinterKind } from "./transport";
import type { PrintErrorKind } from "./printer-state";

/**
 * Chop etish navbati — tiplar va SOF mantiq (IO `print-queue-db.ts` da,
 * bajarish `print-queue-runner.ts` da). `sale-queue.ts` naqshi.
 *
 * Nima uchun navbat kerak: chek YAGONA amal, sotuv esa allaqachon saqlangan.
 * Printer ishlamasa chek shu yerda TURADI va keyin chiqariladi — ilgari u
 * butunlay yo'qolardi.
 */

export type PrintJobKind = "receipt" | "label";

/**
 * `retrying` ataylab YO'Q: u `pending` + `attempt > 0` bilan bir xil holat
 * bo'lardi, lekin qo'shimcha o'tish nuqtasi yaratib, ish yarmida to'xtagan
 * navbatni "osilgan" holatda qoldirish xavfini tug'dirardi (`sale_queue`
 * ham shu sababdan 4 holat bilan cheklangan).
 */
export type PrintJobStatus = "pending" | "printing" | "printed" | "failed";

export interface PrintJob {
  /** Idempotency kaliti — bir xil `job_id` ikki marta chop etilmaydi. */
  job_id: string;
  shop_id: string;
  kind: PrintJobKind;
  /** `ReceiptData` yoki `LabelData[]` — JSON. Maxfiy ma'lumot YO'Q. */
  payload_json: string;
  /** Qaysi printerga mo'ljallangan edi (jurnal uchun; qayta urinishda joriy sozlama olinadi). */
  target_kind: PrinterKind;
  /** Inson o'qiydigan nom — "Chek #A1B2C3". */
  title: string;
  status: PrintJobStatus;
  error: string | null;
  error_kind: PrintErrorKind | null;
  attempt: number;
  created_at: string;
  updated_at: string;
}

/** Bitta ish uchun eng ko'p NAVBAT urinishi (har urinish ichida menejer ham 3 marta uradi). */
export const MAX_JOB_ATTEMPTS = 3;

/** Muvaffaqiyatli cheklar shuncha kundan keyin tozalanadi. */
export const PRINTED_RETENTION_DAYS = 7;

// ── Idempotency kalitlari ───────────────────────────────────────────────────

/**
 * Sotuv cheki — kalit sotuv id'siga BOG'LANGAN. Shu sababli "Chek" tugmasi
 * ikki marta bosilsa ham bitta chek chiqadi (P1-5).
 */
export function receiptJobId(saleId: string): string {
  return `receipt:${saleId}`;
}

/**
 * ATAYLAB qayta chiqarish — HAR SAFAR yangi kalit. Foydalanuvchi Tarixdan
 * "qayta chiqarish" bosganda u chindan ham yangi nusxa xohlaydi; idempotency
 * bu yerda TO'SIQ bo'lmasligi kerak.
 */
export function reprintJobId(saleId: string, nonce: string): string {
  return `reprint:${saleId}:${nonce}`;
}

/** Yorliq — har chiqarish alohida ataylab qilingan amal. */
export function labelJobId(nonce: string): string {
  return `label:${nonce}`;
}

// ── Sof qarorlar ────────────────────────────────────────────────────────────

/** Navbat yana urinsinmi. `attempt` — TUGAGAN urinishlar soni. */
export function shouldRetryJob(attempt: number, kind: PrintErrorKind): boolean {
  // Bekor qilingan va qog'ozsiz ishlar navbatda qayta urinilmaydi — birinchisi
  // xato emas, ikkinchisida odam aralashuvi kerak.
  if (kind === "cancelled" || kind === "device") return false;
  return attempt < MAX_JOB_ATTEMPTS;
}

/**
 * Ilova chop etish PAYTIDA yopilgan ishlar bilan nima qilish.
 *
 * ⚠️ Ular `pending` ga QAYTARILMAYDI. Chek chiqdimi yoki yo'qmi — bilmaymiz,
 * va avtomatik qayta chiqarish "Printer reconnect ≠ Duplicate receipt"
 * qoidasini buzardi (kassir kutmagan ikkinchi chek). Shuning uchun ular
 * `failed` bo'lib navbatda KO'RINADI va foydalanuvchi o'zi qaror qiladi.
 */
export const INTERRUPTED_ERROR = "Ilova chop etish paytida yopildi — chek chiqqani noma'lum";

/** Muvaffaqiyatli ishni saqlash muddati tugadimi. */
export function isExpiredPrinted(updatedAt: string, now: number = Date.now()): boolean {
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return true; // buzilgan sana → saqlashdan ma'no yo'q
  return now - ts > PRINTED_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

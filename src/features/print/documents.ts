import { buildLabelsHtml, type LabelSheetOptions } from "@/features/labels/label-template";
import type { LabelData } from "@/features/labels/barcode-format";

import { buildReceiptHtml } from "./receipt-template";
import { encodeLabel, encodeReceipt } from "./escpos-encoder";
import { getPrinterConfig } from "./printer-settings";
import { shortReceiptId } from "./receipt-id";
import type { PrintJob, PrintJobKind } from "./print-queue";
import type { PrintDocument } from "./transport";
import type { ReceiptData } from "./types";

/**
 * `PrintDocument` quruvchilari — chek va yorliqni IKKI ko'rinishda (ESC-POS va
 * HTML) tavsiflaydi. Qaysi biri ishlatilishini transport hal qiladi.
 *
 * Bu fayl navbat bilan chop etuvchi orasidagi ko'prik: navbatdagi JSON
 * payload shu yerda yana hujjatga aylanadi (`documentFromJob`).
 */

export interface LabelPayload {
  labels: LabelData[];
  opts?: LabelSheetOptions;
}

/*
  Kod sahifasi CHOP ETISH PAYTIDA o'qiladi (`escpos()` ichida), hujjat
  qurilganda emas: navbatdagi chek soatlar keyin chiqishi mumkin va o'sha
  paytdagi sozlama to'g'ri bo'ladi.
*/
export function receiptDocument(data: ReceiptData): PrintDocument {
  return {
    title: `Chek #${shortReceiptId(data.saleId)}`,
    escpos: () => encodeReceipt(data, { codepage: getPrinterConfig().codepage }),
    html: () => buildReceiptHtml(data),
  };
}

export function labelsDocument(payload: LabelPayload): PrintDocument {
  return {
    title: `Yorliq ×${payload.labels.length}`,
    escpos: () => encodeLabel(payload.labels, { codepage: getPrinterConfig().codepage }),
    html: () => buildLabelsHtml(payload.labels, payload.opts),
  };
}

/**
 * JSON payload → hujjat.
 *
 * Payload buzilgan bo'lsa ATAYLAB uloqtiriladi — jim o'tib bo'sh chek
 * chiqarishdan ko'ra ish `failed` bo'lib navbatda ko'rinishi yaxshiroq.
 */
export function documentFor(kind: PrintJobKind, payloadJson: string): PrintDocument {
  const payload: unknown = JSON.parse(payloadJson);
  if (kind === "receipt") return receiptDocument(payload as ReceiptData);
  return labelsDocument(payload as LabelPayload);
}

/** Navbatdagi qatorni yana hujjatga aylantiradi. */
export function documentFromJob(job: PrintJob): PrintDocument {
  return documentFor(job.kind, job.payload_json);
}

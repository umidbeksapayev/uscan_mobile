import i18n from "@/i18n";
import { toast } from "@/lib/toast";
import { logError } from "@/lib/logger";
import { uuidv4 } from "@/lib/uuid";

import { documentFor, receiptDocument } from "./documents";
import { printDocument } from "./printer-manager";
import { printerTarget } from "./printer-settings";
import { printErrorMessage } from "./print-messages";
import { receiptJobId, reprintJobId } from "./print-queue";
import { submitPrintJob } from "./print-queue-runner";
import type { NewPrintJob } from "./print-queue-db";
import type { ReceiptData } from "./types";

/**
 * Chek chiqarishning OMMAVIY API'si. Chaqiruvchilar transportni ham, navbatni
 * ham, qayta urinishni ham bilmaydi.
 *
 * `false` qaytishi sotuv uchun HECH NARSANI bekor qilmaydi: sotuv allaqachon
 * saqlangan (`features/sell/checkout.ts`), chek esa mustaqil amal.
 */

/** Navbat orqali chiqarish + foydalanuvchiga xabar. */
async function runQueued(job: NewPrintJob): Promise<boolean> {
  try {
    const res = await submitPrintJob(job);

    if (res.ok) {
      if (res.duplicate) {
        toast.info(i18n.t("printError.duplicateTitle"), i18n.t("printError.duplicateBody"));
      }
      return true;
    }
    if (res.kind === "cancelled") return false; // o'zi bekor qildi — xabar ortiqcha
    if (res.queued) {
      toast.info(i18n.t("printError.queuedTitle"), i18n.t("printError.queuedBody"));
      return false;
    }
    toast.error(i18n.t("printError.receiptErrorTitle"), printErrorMessage(res.kind));
    return false;
  } catch (e) {
    // Navbat (SQLite) ishlamayapti — chekni YO'QOTMAYMIZ, to'g'ridan-to'g'ri
    // chiqaramiz. Dublikat himoyasi bu yo'lda yo'q, lekin chek chiqadi.
    logError("print.queueUnavailable", e);
    const outcome = await printDocument(documentFor(job.kind, job.payload_json), printerTarget());
    if (!outcome.ok && outcome.kind !== "cancelled") {
      toast.error(i18n.t("printError.receiptErrorTitle"), printErrorMessage(outcome.kind));
    }
    return outcome.ok;
  }
}

/**
 * Sotuv cheki. Kalit sotuv id'siga bog'langan — "Chek" tugmasi ikki marta
 * bosilsa ham BITTA chek chiqadi.
 */
export function printReceipt(data: ReceiptData, shopId: string): Promise<boolean> {
  return runQueued({
    job_id: receiptJobId(data.saleId),
    shop_id: shopId,
    kind: "receipt",
    payload_json: JSON.stringify(data),
    target_kind: printerTarget().kind,
    title: `Chek #${data.saleId}`,
  });
}

/**
 * ATAYLAB qayta chiqarish (Tarix ekrani). Har chaqiruv YANGI ish — bu yerda
 * dublikat himoyasi to'siq bo'lmasligi kerak, foydalanuvchi chindan ham
 * ikkinchi nusxani so'rayapti.
 */
export function reprintReceipt(data: ReceiptData, shopId: string): Promise<boolean> {
  return runQueued({
    job_id: reprintJobId(data.saleId, uuidv4()),
    shop_id: shopId,
    kind: "receipt",
    payload_json: JSON.stringify(data),
    target_kind: printerTarget().kind,
    title: `Chek (nusxa) #${data.saleId}`,
  });
}

/**
 * Sozlamalardagi test cheki — navbatdan TASHQARI. Diagnostika vositasi:
 * muvaffaqiyatsiz test navbatda turib, keyin kutilmaganda chiqib qolmasligi
 * kerak.
 */
export async function printTest(data: ReceiptData): Promise<boolean> {
  const outcome = await printDocument(receiptDocument(data), printerTarget());
  if (!outcome.ok && outcome.kind !== "cancelled") {
    toast.error(i18n.t("printError.testErrorTitle"), printErrorMessage(outcome.kind));
  }
  return outcome.ok;
}

import i18n from "@/i18n";
import { toast } from "@/lib/toast";
import { logError } from "@/lib/logger";
import { uuidv4 } from "@/lib/uuid";
import { printerTarget } from "@/features/print/printer-settings";
import { printDocument } from "@/features/print/printer-manager";
import { printErrorMessage } from "@/features/print/print-messages";
import { labelJobId } from "@/features/print/print-queue";
import { submitPrintJob } from "@/features/print/print-queue-runner";
import { labelsDocument, type LabelPayload } from "@/features/print/documents";

import type { LabelSheetOptions } from "./label-template";
import type { LabelData } from "./barcode-format";

/**
 * Narx yorliqlari — chek bilan BIR XIL yo'ldan ketadi: navbat, qayta ulanish
 * va qayta urinish yorliqlarga ham tegishli.
 *
 * Har chiqarish ALOHIDA ish (`labelJobId` har safar yangi): foydalanuvchi
 * yorliqni qayta bosganda u chindan ham yana nusxa xohlaydi.
 */
export async function printLabels(
  labels: LabelData[],
  shopId: string,
  opts?: LabelSheetOptions,
): Promise<boolean> {
  if (labels.length === 0) return false;
  const payload: LabelPayload = { labels, opts };

  try {
    const res = await submitPrintJob({
      job_id: labelJobId(uuidv4()),
      shop_id: shopId,
      kind: "label",
      payload_json: JSON.stringify(payload),
      target_kind: printerTarget().kind,
      title: `Yorliq ×${labels.length}`,
    });
    if (res.ok) return true;
    if (res.kind === "cancelled") return false;
    if (res.queued) {
      toast.info(i18n.t("printError.labelQueuedTitle"), i18n.t("printError.queuedBody"));
      return false;
    }
    toast.error(i18n.t("printError.labelErrorTitle"), printErrorMessage(res.kind));
    return false;
  } catch (e) {
    // Navbat ishlamayapti → to'g'ridan-to'g'ri (chek bilan bir xil zaxira yo'l).
    logError("print.labels.queueUnavailable", e);
    const outcome = await printDocument(labelsDocument(payload), printerTarget());
    if (!outcome.ok && outcome.kind !== "cancelled") {
      toast.error(i18n.t("printError.labelErrorTitle"), printErrorMessage(outcome.kind));
    }
    return outcome.ok;
  }
}

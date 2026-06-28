import * as Print from "expo-print";

import { toast } from "@/lib/toast";
import { getPrinterConfig } from "@/features/print/printer-settings";
import { printLabelsBluetooth } from "@/features/print/bt-print";

import { buildLabelsHtml, type LabelSheetOptions } from "./label-template";
import type { LabelData } from "./barcode-format";

/**
 * Narx yorliqlarini sozlamaga qarab chiqaradi (printReceipt naqshi):
 *  - bluetooth (ESC-POS termal) → printLabelsBluetooth (GS k barcode)
 *  - system (default) → expo-print (Android Print Framework / AirPrint / PDF),
 *    barcode inline SVG sifatida chiziladi.
 */
export async function printLabels(
  labels: LabelData[],
  opts?: LabelSheetOptions,
): Promise<boolean> {
  if (labels.length === 0) return false;
  const cfg = getPrinterConfig();
  try {
    if (cfg.type === "bluetooth" && cfg.btAddress) {
      await printLabelsBluetooth(labels, cfg.btAddress);
      return true;
    }
    await Print.printAsync({ html: buildLabelsHtml(labels, opts) });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Print xatosi";
    if (/cancel|dismiss/i.test(msg)) return false; // foydalanuvchi bekor qildi
    toast.error("Yorliq chiqarish", `Xatolik: ${msg}`);
    return false;
  }
}

import * as Print from "expo-print";
import { Alert } from "react-native";

import { buildReceiptHtml } from "./receipt-template";
import { getPrinterConfig } from "./printer-settings";
import { printReceiptBluetooth } from "./bt-print";
import type { ReceiptData } from "./types";

/**
 * Chekni sozlamaga qarab chiqaradi:
 *  - bluetooth (ESC-POS termal) → bt-print
 *  - system (default) → expo-print (Android Print Framework / AirPrint / PDF)
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  const cfg = getPrinterConfig();
  try {
    if (cfg.type === "bluetooth" && cfg.btAddress) {
      await printReceiptBluetooth(data, cfg.btAddress);
      return true;
    }
    await Print.printAsync({ html: buildReceiptHtml(data) });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Print xatosi";
    if (/cancel|dismiss/i.test(msg)) return false; // foydalanuvchi bekor qildi
    Alert.alert("Chek chiqarish", `Xatolik: ${msg}`);
    return false;
  }
}

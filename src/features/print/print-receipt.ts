import * as Print from "expo-print";
import { Alert } from "react-native";

import { buildReceiptHtml } from "./receipt-template";
import type { ReceiptData } from "./types";

/** HTML chekni tizim print dialogiga yuborish (Android Print Framework / AirPrint). */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  try {
    const html = buildReceiptHtml(data);
    await Print.printAsync({ html });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Print xatosi";
    // Foydalanuvchi dialogni bekor qilsa ham xato keladi — uni jim o'tkazamiz
    if (/cancel|dismiss/i.test(msg)) return false;
    Alert.alert("Chek chiqarish", `Xatolik: ${msg}`);
    return false;
  }
}

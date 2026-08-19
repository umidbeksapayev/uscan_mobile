import * as Print from "expo-print";

import type { PrintDocument, PrinterTransport } from "../transport";

/**
 * Tizim printeri (Android Print Framework / AirPrint / PDF) — `expo-print`
 * ustidagi yagona qatlam.
 *
 * ⚠️ Bu ZAXIRA yo'l, POS'ning asosiy oqimi EMAS: har chekda tizim dialogi
 * ochiladi va kassir uni qo'l bilan tasdiqlashi kerak. Termal printeri
 * bo'lmagan do'kon, PDF saqlash va qo'lda chiqarish uchun.
 *
 * Ulanish tushunchasi yo'q — `connect`/`disconnect` ataylab no-op.
 */
export const systemTransport: PrinterTransport = {
  kind: "system",

  async connect(): Promise<void> {
    // Tizim dialogi — ulanish holati yo'q.
  },

  async write(doc: PrintDocument): Promise<void> {
    await Print.printAsync({ html: doc.html() });
  },

  async disconnect(): Promise<void> {
    // No-op.
  },
};

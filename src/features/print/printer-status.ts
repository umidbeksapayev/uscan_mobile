import type { PrinterStatus } from "./printer-state";

/**
 * Holat → UI ko'rsatkichi. SOF funksiya (rang tokeni nomi bilan, qiymati
 * bilan emas — mavzu almashganda ekran o'zi hal qiladi).
 */
export interface StatusView {
  /** i18n kaliti. */
  labelKey: string;
  /** `theme/colors` dagi semantik rang nomi. */
  tone: "success" | "warning" | "danger" | "muted";
}

/**
 * ⚠️ `printing` ham YASHIL: kassir uchun "chiqarilmoqda" bu muammo emas,
 * ish ketayotgani. Sariq faqat ORALIQ (ulanmoqda) holat uchun — u kutish
 * kerakligini bildiradi.
 */
export function statusView(status: PrinterStatus): StatusView {
  switch (status) {
    case "connected":
      return { labelKey: "printer.statusConnected", tone: "success" };
    case "printing":
      return { labelKey: "printer.statusPrinting", tone: "success" };
    case "connecting":
      return { labelKey: "printer.statusConnecting", tone: "warning" };
    case "error":
      return { labelKey: "printer.statusError", tone: "danger" };
    default:
      return { labelKey: "printer.statusDisconnected", tone: "muted" };
  }
}

/**
 * Tizim printeri uchun holat ko'rsatkichi MA'NOSIZ — u dialog ochadi, ulanish
 * tutmaydi. Ko'rsatilsa foydalanuvchi "🔴 ulanmagan" ni nosozlik deb o'ylardi.
 */
export function showsConnectionStatus(kind: string): boolean {
  return kind !== "system";
}

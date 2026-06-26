import { colors } from "@/theme/colors";

/** Intent holatini UI ko'rinishga (sof funksiya — test qilinadi). */
export type AcquiringStatus = "idle" | "pending" | "paid" | "canceled" | "timeout" | "error";

export type AcqIcon =
  | "qr-code-outline"
  | "checkmark-circle"
  | "close-circle"
  | "alert-circle"
  | "hourglass-outline";

export function mapIntentStatus(status: string | null | undefined): AcquiringStatus {
  if (!status || status === "pending") return "pending";
  if (status === "paid") return "paid";
  if (status === "canceled") return "canceled";
  if (status === "timeout") return "timeout";
  return "error";
}

export function acquiringStatusUI(status: AcquiringStatus): {
  label: string;
  color: string;
  icon: AcqIcon;
} {
  switch (status) {
    case "paid":
      return { label: "To'landi", color: colors.success, icon: "checkmark-circle" };
    case "canceled":
      return { label: "Bekor qilindi", color: colors.danger, icon: "close-circle" };
    case "timeout":
      return { label: "Vaqt tugadi", color: colors.danger, icon: "hourglass-outline" };
    case "error":
      return { label: "Xatolik", color: colors.danger, icon: "alert-circle" };
    default:
      return { label: "QR ni skanerlang...", color: colors.warning, icon: "qr-code-outline" };
  }
}

/**
 * To'lov holati — sof mantiq (Supabase/hook'siz, unit-test qilinadi;
 * loyihadagi boshqa `-math.ts` / `plan-math.ts` fayllar naqshiga mos).
 *
 * Bu yerda faqat "holat → foydalanuvchi nima ko'radi va nima qila oladi"
 * savoli hal qilinadi. Server bilan gaplashish `payments-api.ts` da.
 */

export type PaymentStatus = "pending" | "reviewing" | "approved" | "rejected" | "expired";

export type RejectionCode = "wrong_amount" | "unreadable" | "not_found" | "duplicate" | "other";

export const REJECTION_CODES: readonly RejectionCode[] = [
  "wrong_amount",
  "unreadable",
  "not_found",
  "duplicate",
  "other",
];

/** Nishon (Badge) ohangi — `components/ui/badge.tsx` bilan bir xil so'zlar. */
export type StatusTone = "brand" | "neutral" | "success" | "danger" | "warning";

const TONES: Record<PaymentStatus, StatusTone> = {
  pending: "neutral",
  reviewing: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
};

export function statusTone(status: PaymentStatus): StatusTone {
  return TONES[status];
}

/** To'lov hali "tirik"mi — foydalanuvchi u bilan ish qila oladimi. */
export function isActivePayment(status: PaymentStatus): boolean {
  return status === "pending" || status === "reviewing";
}

/**
 * Chek yuborish mumkinmi. `reviewing` holatida ham TRUE — foydalanuvchi
 * noto'g'ri chek yuborgan bo'lsa, admin ko'rishidan oldin almashtira olsin
 * (server ham shu qoidani majburlaydi: `submit_payment_receipt`).
 */
export function canSubmitReceipt(status: PaymentStatus): boolean {
  return status === "pending" || status === "reviewing";
}

/** Foydalanuvchi bekor qila oladimi. */
export function canCancel(status: PaymentStatus): boolean {
  return isActivePayment(status);
}

/**
 * Rad etilgan yoki muddati o'tgan to'lovdan keyin qaytadan boshlash mumkin —
 * UI'da "Qayta urinish" tugmasi shu asosda chiqadi.
 */
export function canRetry(status: PaymentStatus): boolean {
  return status === "rejected" || status === "expired";
}

/**
 * Checkout ekranidagi qadam (1-based). Talab #10: foydalanuvchi qayerdaligini
 * har doim bilishi kerak.
 *   1 — tarif tanlangan, to'lov qilinmagan
 *   2 — chek yuborilgan, tekshirilmoqda
 *   3 — tasdiqlangan
 */
export function checkoutStep(status: PaymentStatus): 1 | 2 | 3 {
  if (status === "approved") return 3;
  if (status === "reviewing") return 2;
  return 1;
}

/** i18n kaliti — `billing.paymentStatus.<status>`. */
export function statusLabelKey(status: PaymentStatus): string {
  return `billing.paymentStatus.${status}`;
}

/** i18n kaliti — rad etish sababi. */
export function rejectionLabelKey(code: RejectionCode): string {
  return `billing.rejection.${code}`;
}

/** Yillik tarifda necha oy (server ham shu qoidani ishlatadi). */
export function monthsForPeriod(period: "month" | "year"): number {
  return period === "year" ? 12 : 1;
}

/**
 * Karta raqamini maskalash: faqat oxirgi 4 raqam ko'rinadi (talab #3).
 * Kirish raqamlardan iborat bo'lmasa o'zgarishsiz qaytadi — kutilmagan
 * formatni buzib ko'rsatgandan ko'ra o'zini ko'rsatgan yaxshi.
 */
export function maskCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return raw;

  const first4 = digits.slice(0, 4);
  const last4 = digits.slice(-4);
  const middleGroups = Math.max(0, Math.ceil((digits.length - 8) / 4));
  const masked = Array.from({ length: middleGroups }, () => "****").join(" ");
  return [first4, masked, last4].filter(Boolean).join(" ");
}

/** Ko'chirish uchun — bo'sh joysiz toza raqam. */
export function plainCardNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

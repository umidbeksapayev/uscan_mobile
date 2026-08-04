/**
 * Fikr-mulohaza validatsiyasi — sof funksiya (test qilinadi).
 *
 * Cheklovlar web bilan bir xil (`ShopScan_1v/src/app/api/feedback/route.ts`):
 * matn bo'sh bo'lmasligi va 2000 belgidan oshmasligi kerak. Kategoriya
 * `028_feedback.sql` dagi CHECK bilan mos bo'lishi shart — aks holda insert
 * DB darajasida rad etiladi.
 */

/** DB CHECK (`028_feedback.sql`) bilan bir xil ro'yxat. */
export const FEEDBACK_CATEGORIES = ["suggestion", "complaint", "bug"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** Web route bilan bir xil chegara. */
export const FEEDBACK_MAX_LENGTH = 2000;

export type FeedbackValidationError = "empty" | "tooLong" | "badCategory";

export function isFeedbackCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Yuborishdan oldingi tekshiruv. `null` — xato yo'q.
 * Matn `trim()` qilingan holda o'lchanadi: faqat bo'sh joydan iborat xabar
 * "bo'sh" hisoblanadi, chegara esa saqlanadigan matnga nisbatan qo'llanadi.
 */
export function validateFeedback(input: {
  category: string;
  message: string;
}): FeedbackValidationError | null {
  if (!isFeedbackCategory(input.category)) return "badCategory";
  const text = input.message.trim();
  if (!text) return "empty";
  if (text.length > FEEDBACK_MAX_LENGTH) return "tooLong";
  return null;
}

/** Qolgan belgilar soni — hisoblagich uchun (manfiy bo'lishi mumkin). */
export function remainingChars(message: string): number {
  return FEEDBACK_MAX_LENGTH - message.trim().length;
}

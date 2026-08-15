/**
 * To'lov RPC'laridan kelgan texnik xato kodlarini tushunarli matnga
 * aylantiradi (`lib/auth-errors.ts`, `onboarding-errors.ts`,
 * `invite-errors.ts` naqshiga mos — talab #13: foydalanuvchi hech qachon
 * xom texnik xatoni ko'rmaydi).
 */
export function paymentErrorMessage(message?: string | null): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("payment_already_approved")) {
    return "Bu to'lov allaqachon tasdiqlangan.";
  }
  if (m.includes("payment_not_active")) {
    return "Bu to'lov bilan endi ishlab bo'lmaydi. Yangi to'lov boshlang.";
  }
  if (m.includes("payment_not_found")) {
    return "To'lov topilmadi. Ro'yxatni yangilang.";
  }
  if (m.includes("receipt_required")) {
    return "Avval chekni yuklang.";
  }
  if (m.includes("invalid_receipt_path")) {
    return "Chek fayli noto'g'ri. Qaytadan yuklang.";
  }
  if (m.includes("plan_not_purchasable")) {
    return "Bu tarifni sotib olib bo'lmaydi.";
  }
  if (m.includes("unknown_plan")) {
    return "Tarif topilmadi.";
  }
  if (m.includes("invalid_period")) {
    return "Muddat noto'g'ri tanlandi.";
  }
  if (m.includes("ruxsat yo'q") || m.includes("ruxsat yo") || m.includes("permission")) {
    return "Bu amal uchun ruxsatingiz yo'q.";
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("timeout")) {
    return "Internet aloqasi yo'q. Ulanishni tekshirib qayta urining.";
  }
  if (m.includes("duplicate key") || m.includes("uq_payments_active")) {
    return "Sizda allaqachon davom etayotgan to'lov bor.";
  }

  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}

/** Chek tanlash/yuklash xatolari (`receipt-upload.ts` dagi `ReceiptError`). */
export function receiptErrorMessage(code: "too_large" | "bad_format" | "read_failed"): string {
  if (code === "too_large") return "Fayl juda katta (10 MB gacha bo'lishi kerak).";
  if (code === "bad_format") return "Format qo'llab-quvvatlanmaydi. JPG, PNG, WEBP yoki PDF yuklang.";
  return "Faylni o'qib bo'lmadi. Boshqa fayl tanlab ko'ring.";
}

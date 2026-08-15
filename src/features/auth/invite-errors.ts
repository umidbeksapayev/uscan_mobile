/**
 * `invite_shop_member` / `respond_shop_invite` RPC'laridan kelgan texnik
 * xato kodlarini tushunarli matnga aylantiradi (`lib/auth-errors.ts` va
 * `onboarding-errors.ts` naqshiga mos). Tarif limiti xatosi bu yerga
 * kirmaydi — u `parsePlanLimitError` bilan alohida ushlanadi.
 */
export function inviteErrorMessage(message?: string | null): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("already_member")) return "Bu foydalanuvchi allaqachon xodim.";
  if (m.includes("invalid_email")) return "Email formati noto'g'ri.";
  if (m.includes("invite_not_found"))
    return "Taklif topilmadi yoki allaqachon javob berilgan. Ro'yxatni yangilang.";
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Internet aloqasi yo'q. Ulanishni tekshirib qayta urining.";
  }

  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}

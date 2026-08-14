/**
 * `complete_onboarding()` RPC'dan kelgan texnik xato kodlarini foydalanuvchiga
 * tushunarli matnga aylantiradi (`lib/auth-errors.ts` naqshiga mos).
 */
export function onboardingErrorMessage(message?: string | null): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("shop_name_required")) return "Do'kon nomini kiriting.";
  if (m.includes("invalid_language")) return "Til noto'g'ri tanlandi.";
  if (m.includes("already_onboarded")) return "Sizda allaqachon do'kon mavjud.";
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Internet aloqasi yo'q. Ulanishni tekshirib qayta urining.";
  }

  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}

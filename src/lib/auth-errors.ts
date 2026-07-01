/**
 * Supabase auth xatolari inglizcha/texnik bo'ladi — foydalanuvchiga tushunarli
 * o'zbekcha matnga aylantiradi. (Web ilovadagi auth-errors.ts ga mos.)
 */
export function authErrorMessage(message?: string | null): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("invalid login credentials")) return "Email yoki parol noto'g'ri.";
  if (m.includes("email not confirmed")) return "Email hali tasdiqlanmagan.";
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  )
    return "Bu email allaqachon ro'yxatdan o'tgan.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "Parol juda oddiy (kamida 6 belgi).";
  if (
    m.includes("unable to validate email") ||
    m.includes("invalid email") ||
    m.includes("invalid format")
  )
    return "Email formati noto'g'ri.";
  if (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("load failed")
  )
    return "Internet yo'q yoki Supabase sozlanmagan (.env).";
  if (m.includes("expired") || m.includes("invalid") || m.includes("otp"))
    return "Havola muddati o'tgan yoki noto'g'ri. Qaytadan so'rang.";

  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}

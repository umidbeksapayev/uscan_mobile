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

/**
 * Email havolasi XATO bilan qaytganda ko'rsatiladigan matn
 * (`parseAuthUrlError` kodi bo'yicha).
 *
 * `otp_expired` — eng ko'p uchraydigani va u ko'pincha "muddati o'tgan"
 * emas, "allaqachon ishlatilgan" degani: pochta xizmati havolani
 * xavfsizlik tekshiruvi uchun oldindan ochib, bir martalik tokenni sarflab
 * yuboradi. Shuning uchun matn ikkala holatni ham qamrab oladi.
 */
export function authLinkErrorMessage(code: string): string {
  const c = code.toLowerCase();

  if (c.includes("otp_expired") || c.includes("expired")) {
    return "Havola muddati o'tgan yoki allaqachon ishlatilgan. Yangi havola so'rang va uni pochta ochilishi bilan darhol bosing.";
  }
  if (c.includes("access_denied")) {
    return "Havola qabul qilinmadi. Yangi havola so'rab qayta urinib ko'ring.";
  }
  return "Havola yaroqsiz. Yangi havola so'rang.";
}

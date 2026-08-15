export interface AuthUrlTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Supabase implicit-flow deep link'laridan
 * (`uscan://<yo'l>#access_token=...&refresh_token=...&type=<type>`)
 * token'larni ajratib oladi. Parolni tiklash (`type=recovery`, ko'r.
 * `parse-recovery-url.ts`) va email tasdiqlash (`type=signup`, ko'r.
 * `verify-email.tsx`) havolalari bir xil shaklda keladi — farqi faqat
 * `type` va yo'l. Sof funksiya — Linking/supabase'siz testda tekshiriladi.
 */
export function parseAuthUrlTokens(
  url: string | null | undefined,
  expectedType: string,
): AuthUrlTokens | null {
  if (!url) return null;
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  if (params.get("type") !== expectedType) return null;

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

/**
 * Havolani DIAGNOSTIKA uchun tavsiflaydi — token QIYMATLARINI oshkor
 * qilmasdan: sxema/yo'l va parametr NOMLARI.
 *
 * Nega kerak: havola kutilgan shaklda kelmasa ("token ham yo'q, xato ham
 * yo'q") sababni taxmin qilishdan boshqa yo'l qolmaydi. Bu funksiya
 * jurnalda aynan nima kelganini ko'rsatadi, lekin `access_token` qiymati
 * jurnalga tushmaydi (u sessiya kaliti — jurnal esa yuborilishi mumkin).
 */
export function describeAuthUrl(url: string | null | undefined): string {
  if (!url) return "url=null";

  const hashIndex = url.indexOf("#");
  const qIndex = url.indexOf("?");
  const cut = Math.min(...[hashIndex, qIndex].filter((i) => i !== -1).concat([url.length]));
  const base = url.slice(0, cut);

  const keys = (part: string) => [...new URLSearchParams(part).keys()].join(",") || "-";
  const query = qIndex === -1 ? "-" : keys(url.slice(qIndex + 1, hashIndex === -1 ? undefined : hashIndex));
  const fragment = hashIndex === -1 ? "-" : keys(url.slice(hashIndex + 1));

  return `base=${base} query=[${query}] fragment=[${fragment}]`;
}

export interface AuthUrlError {
  /** `otp_expired`, `access_denied` va h.k. */
  code: string;
  /** Supabase bergan inson o'qiy oladigan matn (inglizcha). */
  description: string | null;
}

/**
 * Havola XATO bilan qaytganini aniqlaydi
 * (`uscan://reset-password#error=access_denied&error_code=otp_expired&...`).
 *
 * Busiz har qanday muvaffaqiyatsizlik bir xil "havola yaroqsiz" bo'lib
 * ko'rinardi va SABABI yo'qolardi — muddati o'tganmi, allaqachon
 * ishlatilganmi yoki umuman boshqa narsami, bilib bo'lmasdi.
 *
 * Eng ko'p uchraydigan sabab: pochta xizmati (Gmail) havolani xavfsizlik
 * uchun oldindan ochib ko'radi va bir martalik tokenni "yeb qo'yadi" —
 * foydalanuvchi bosganda u allaqachon ishlatilgan bo'ladi.
 */
export function parseAuthUrlError(url: string | null | undefined): AuthUrlError | null {
  if (!url) return null;
  const hashIndex = url.indexOf("#");
  const qIndex = url.indexOf("?");
  // Xato goh fragment'da, goh query'da keladi — ikkalasini ham qaraymiz.
  const parts: string[] = [];
  if (hashIndex !== -1) parts.push(url.slice(hashIndex + 1));
  if (qIndex !== -1) parts.push(url.slice(qIndex + 1, hashIndex === -1 ? undefined : hashIndex));
  if (parts.length === 0) return null;

  for (const part of parts) {
    const params = new URLSearchParams(part);
    const code = params.get("error_code") ?? params.get("error");
    if (code) {
      return { code, description: params.get("error_description") };
    }
  }
  return null;
}

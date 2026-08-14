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

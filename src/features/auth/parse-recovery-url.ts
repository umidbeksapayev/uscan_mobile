export interface RecoveryTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Parolni tiklash email-havolasi (`uscan://reset-password#access_token=...&
 * refresh_token=...&type=recovery`) — Supabase implicit-flow tokenlarini URL
 * fragment'idan (`#...`) ajratib oladi. Sof funksiya (deep-link parsing —
 * Linking/supabase'siz testda tekshiriladi).
 */
export function parseRecoveryParams(url: string | null | undefined): RecoveryTokens | null {
  if (!url) return null;
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  if (params.get("type") !== "recovery") return null;

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

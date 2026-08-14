import { parseAuthUrlTokens, type AuthUrlTokens } from "./parse-auth-url";

export type RecoveryTokens = AuthUrlTokens;

/**
 * Parolni tiklash email-havolasi (`uscan://reset-password#access_token=...&
 * refresh_token=...&type=recovery`) — umumiy parser (`parse-auth-url.ts`)
 * ustidan `type=recovery` bilan yupqa qatlam.
 */
export function parseRecoveryParams(url: string | null | undefined): RecoveryTokens | null {
  return parseAuthUrlTokens(url, "recovery");
}

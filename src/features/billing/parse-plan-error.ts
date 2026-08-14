/**
 * DB `RAISE EXCEPTION 'plan_limit_<key>:<limit>'` (042_plan_limits_enforce.sql)
 * xato satridan ajratib oladi — `lib/auth-errors.ts` naqshiga mos: texnik
 * PostgREST xabari → UI'ga tushunarli struktura. Sof funksiya, unit-test.
 */
export type PlanLimitKey = "products" | "members" | "shops" | "ai_daily";

export interface PlanLimitError {
  key: PlanLimitKey;
  limit: number;
}

const PLAN_LIMIT_KEYS: readonly PlanLimitKey[] = ["products", "members", "shops", "ai_daily"];

export function parsePlanLimitError(message?: string | null): PlanLimitError | null {
  if (!message) return null;
  const match = message.match(/plan_limit_([a-z_]+):(\d+)/);
  if (!match) return null;

  const key = match[1];
  if (!PLAN_LIMIT_KEYS.includes(key as PlanLimitKey)) return null;

  return { key: key as PlanLimitKey, limit: Number(match[2]) };
}

import { TASHKENT_OFFSET_MS } from "@/lib/format";

/** (today − (days−1)) mahalliy (Toshkent) yarim tunining UTC instanti —
 *  davr filtrlari uchun (eksport va kassir hisobotida umumiy). */
export function periodStartIso(days: number): string {
  const nowTash = new Date(Date.now() + TASHKENT_OFFSET_MS);
  const ms =
    Date.UTC(nowTash.getUTCFullYear(), nowTash.getUTCMonth(), nowTash.getUTCDate() - (days - 1)) -
    TASHKENT_OFFSET_MS;
  return new Date(ms).toISOString();
}

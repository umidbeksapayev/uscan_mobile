import { TASHKENT_OFFSET_MS } from "@/lib/format";

/** Kunlik xulosa eslatmasi vaqti (lokal bildirishnoma). */
export type ReminderSlot = "morning" | "evening" | "off";

export const SLOT_TIME: Record<Exclude<ReminderSlot, "off">, { hour: number; minute: number }> = {
  morning: { hour: 9, minute: 0 },
  evening: { hour: 21, minute: 0 },
};

/** Toshkent bo'yicha bugungi sana (yyyy-mm-dd) — "kuniga bir marta" gating uchun. */
export function tashkentDateString(now: Date = new Date()): string {
  return new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Kam-qoldiq eslatmasi bugun allaqachon rejalashtirilganmi. */
export function shouldNotifyLowStock(lastNotifiedDate: string | null, today: string): boolean {
  return lastNotifiedDate !== today;
}

/**
 * Keyingi hh:mm ning QURILMA mahalliy vaqtidagi instanti — bugun hali kelmagan
 * bo'lsa bugun, aks holda ertaga. (Lokal bildirishnoma qurilma soatida chaladi.)
 */
export function nextOccurrence(hour: number, minute: number, now: Date = new Date()): Date {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

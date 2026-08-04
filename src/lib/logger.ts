import { meta, MetaKeys } from "@/lib/offline/mmkv";
import { appendEntry, formatLogText, toMessage, type LogEntry } from "./log-buffer";

/**
 * Xatolik jurnali (A5) — ilgari `.catch(() => {})` bilan jimgina yutilgan
 * xatolar shu yerga yoziladi.
 *
 * Ikki kanal: `__DEV__` da konsol (darhol ko'rinadi), har doim MMKV halqa-bufer
 * (Sozlamalar > Diagnostika'dan o'qiladi/ulashiladi). Log yozish HECH QACHON
 * chaqiruvchi oqimni to'xtatmasligi kerak — shuning uchun o'zi ham himoyalangan.
 */
export function logError(scope: string, err: unknown): void {
  const entry: LogEntry = {
    at: new Date().toISOString(),
    scope,
    message: toMessage(err),
  };

  if (__DEV__) {
    console.warn(`[${scope}]`, err);
  }

  try {
    const current = meta.getJSON<LogEntry[]>(MetaKeys.errorLog) ?? [];
    meta.setJSON(MetaKeys.errorLog, appendEntry(current, entry));
  } catch {
    // MMKV yozuvi ham yiqilsa — jim o'tamiz: log yozolmaslik ilovani
    // to'xtatadigan sabab emas.
  }
}

/** Jurnal yozuvlari — eng yangisi birinchi. */
export function readLog(): LogEntry[] {
  return meta.getJSON<LogEntry[]>(MetaKeys.errorLog) ?? [];
}

/** Jurnalni tozalash. */
export function clearLog(): void {
  meta.remove(MetaKeys.errorLog);
}

/** Ulashish uchun matn ko'rinishi. */
export function logAsText(): string {
  return formatLogText(readLog());
}

/**
 * Xatolik jurnali — sof funksiyalar (A5).
 *
 * Loyihada telemetriya xizmati (Sentry va h.k.) yo'q va qo'shilmaydi: xatolar
 * qurilmaning o'zida, cheklangan halqa-buferda saqlanadi. Foydalanuvchi kerak
 * bo'lganda "Diagnostika"dan ko'radi/ulashadi.
 *
 * ⚠️ Bu yerga MAXFIY ma'lumot yozilmaydi (`cost_price`, token, parol) — bufer
 * ulashilishi mumkin, ya'ni undagi hamma narsa foydalanuvchidan tashqariga
 * chiqishi mumkin.
 */

export interface LogEntry {
  /** ISO vaqt. */
  at: string;
  /** Qayerdan — masalan `sync.push` yoki `notify.schedule`. */
  scope: string;
  /** Xato matni (stack emas — bufer kichik bo'lishi kerak). */
  message: string;
}

/** Bufer sig'imi — eng eski yozuvlar chiqarib tashlanadi. */
export const LOG_BUFFER_MAX = 50;

/** Bitta yozuv matni chegarasi — bitta ulkan xato buferni to'ldirib qo'ymasin. */
export const LOG_MESSAGE_MAX = 300;

/** Noma'lum `catch` qiymatini o'qiladigan matnga aylantirish. */
export function toMessage(err: unknown): string {
  let text: string;
  if (err instanceof Error) text = err.message || err.name;
  else if (typeof err === "string") text = err;
  else if (err === null || err === undefined) text = "unknown";
  else {
    try {
      text = JSON.stringify(err);
    } catch {
      text = String(err);
    }
  }
  return text.length > LOG_MESSAGE_MAX ? `${text.slice(0, LOG_MESSAGE_MAX)}…` : text;
}

/**
 * Yangi yozuvni buferga qo'shish — eng yangisi boshida turadi.
 * Toza (mutatsiyasiz) funksiya: yangi massiv qaytaradi.
 */
export function appendEntry(
  buffer: LogEntry[],
  entry: LogEntry,
  max: number = LOG_BUFFER_MAX,
): LogEntry[] {
  if (max <= 0) return [];
  return [entry, ...buffer].slice(0, max);
}

/** Buferni ulashiladigan matnga aylantirish (eng yangisi yuqorida). */
export function formatLogText(entries: LogEntry[]): string {
  if (entries.length === 0) return "";
  return entries.map((e) => `${e.at} [${e.scope}] ${e.message}`).join("\n");
}

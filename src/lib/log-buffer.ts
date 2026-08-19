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

import type { LogDomain } from "./log-domain";

export interface LogEntry {
  /** ISO vaqt. */
  at: string;
  /** Qayerdan — masalan `sync.push` yoki `notify.schedule`. */
  scope: string;
  /** Xato matni (stack emas — bufer kichik bo'lishi kerak). */
  message: string;
  /**
   * Guruh — `scope` prefiksidan chiqariladi (`log-domain.ts`).
   * ESKI yozuvlarda YO'Q: bufer versiyalanmagan, shuning uchun ixtiyoriy.
   */
  domain?: LogDomain;
}

/** Bufer sig'imi — eng eski yozuvlar chiqarib tashlanadi. */
export const LOG_BUFFER_MAX = 50;

/** Bitta yozuv matni chegarasi — bitta ulkan xato buferni to'ldirib qo'ymasin. */
export const LOG_MESSAGE_MAX = 300;

/**
 * Maxfiy ma'lumotni jurnaldan o'chirish.
 *
 * ⚠️ Bu KOSMETIKA emas, xavfsizlik: bufer "Ulashish" tugmasi bilan tashqariga
 * chiqadi, Supabase xatolari esa ichida JWT olib kelishi mumkin ("Invalid
 * token: eyJhbGciOi…"). Ulashilgan jurnal bilan birga sessiya ham ketardi.
 *
 * ⚠️ Karta raqami niqobi 14–19 raqamli ketma-ketlikka qo'yilgan, 13 emas:
 * EAN-13 shtrix-kod AYNAN 13 raqam va u jurnalda o'qiladigan qolishi kerak
 * (skaner muammolarini shusiz tekshirib bo'lmaydi).
 */
export function redact(text: string): string {
  return (
    text
      // 1. JWT / Supabase access token — eng aniq naqsh, shuning uchun birinchi.
      .replace(/eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}/g, "<token>")
      // 2. `Bearer <token>` — kalit=qiymat qoidasidan OLDIN turishi SHART:
      //    aks holda u faqat "Bearer" so'zini yeb, tokenning o'zini qoldirardi.
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted>")
      // 3. kalit=qiymat · kalit: qiymat · "kalit": "qiymat"
      //    Kalitdan keyingi ixtiyoriy qo'shtirnoq (`"password":`) hisobga olinadi.
      .replace(
        /\b(password|passwd|pwd|token|apikey|api_key|secret|authorization)\b["']?\s*[:=]\s*["']?[^\s"',;}]+/gi,
        "$1=<redacted>",
      )
      // 4. Karta raqami — 14–19 raqam (ajratgichli bo'lsa ham), oxirgi 4 qoladi.
      .replace(/\b(?:\d[ -]?){13,18}\d\b/g, (m) => {
        const digits = m.replace(/\D/g, "");
        return `****${digits.slice(-4)}`;
      })
  );
}

/** Noma'lum `catch` qiymatini o'qiladigan (va maxfiyliksiz) matnga aylantirish. */
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
  // Kesishdan OLDIN tozalanadi — aks holda yarim qirqilgan token qolib ketardi.
  const safe = redact(text);
  return safe.length > LOG_MESSAGE_MAX ? `${safe.slice(0, LOG_MESSAGE_MAX)}…` : safe;
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
  return entries
    .map((e) => `${e.at} [${e.domain ?? "APP"}] [${e.scope}] ${e.message}`)
    .join("\n");
}

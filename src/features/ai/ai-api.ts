import { supabase } from "@/lib/supabase";
import { uuidv4 } from "@/lib/uuid";

/**
 * AI yordamchi bilan aloqa — `ai-chat` Edge Function.
 *
 * Gemini kaliti serverda qoladi (Supabase secrets), ilova faqat o'z
 * Supabase'iga murojaat qiladi. Batafsil: docs/AI_ASSISTANT_PLAN_2026-08.md
 */

export interface AiChatResult {
  chat_id: string;
  /** Saqlangan javob xabari — 👍/👎 shu qatorga yoziladi. */
  message_id: string | null;
  text: string;
  /** Javob tayyorlashda chaqirilgan tool nomlari (UI da chip sifatida). */
  tools_used: string[];
  model: string;
  usage: { input: number; output: number };
  quota: { used: number; limit: number };
}

/** Server qaytaradigan xato kodlari — UI shu bo'yicha xabar tanlaydi. */
export type AiErrorCode =
  | "owner_only"
  | "quota_exceeded"
  | "rate_limited"
  | "gemini_error"
  | "timeout"
  | "message_too_long"
  | "unknown";

export class AiChatError extends Error {
  constructor(
    readonly code: AiErrorCode,
    /** Kvota tugaganda — limit raqami (xabarda ko'rsatiladi). */
    readonly limit?: number,
  ) {
    super(code);
    this.name = "AiChatError";
  }
}

const KNOWN_CODES: AiErrorCode[] = [
  "owner_only",
  "quota_exceeded",
  "rate_limited",
  "gemini_error",
  "timeout",
  "message_too_long",
];

/**
 * Edge Function xatosidan kod ajratib oladi.
 * `supabase-js` xato tanasini `context` (Response) ichida beradi — o'qilmasa
 * "unknown" qaytadi, ya'ni UI baribir tushunarli xabar ko'rsatadi.
 */
async function parseError(error: unknown): Promise<AiChatError> {
  const ctx = (error as { context?: Response })?.context;
  if (!ctx || typeof ctx.json !== "function") return new AiChatError("unknown");

  try {
    const body = (await ctx.json()) as { error?: string; limit?: number };
    const code = KNOWN_CODES.find((c) => c === body.error);
    return new AiChatError(code ?? "unknown", body.limit);
  } catch {
    return new AiChatError("unknown");
  }
}

/**
 * Javobga baho (👍 = 1, 👎 = -1).
 *
 * To'g'ridan-to'g'ri jadvalga yoziladi: RLS o'z chatini, migration 035 dagi
 * ustun darajasidagi GRANT esa faqat `rating` ustunini o'zgartirishga ruxsat
 * beradi — javob matni yoki token hisobi klientdan buzilmaydi.
 * Xato jim yutiladi: baho — ikkilamchi harakat, u tufayli chat buzilmasin.
 */
export async function rateAiMessage(messageId: string, rating: 1 | -1): Promise<void> {
  const { error } = await supabase
    .from("ai_messages")
    .update({ rating })
    .eq("id", messageId);
  if (error) throw new Error(error.message);
}

export interface SendAiMessageParams {
  shopId: string;
  message: string;
  /** Davom etayotgan suhbat. Bo'sh bo'lsa server yangi chat ochadi. */
  chatId?: string;
}

export async function sendAiMessage({
  shopId,
  message,
  chatId,
}: SendAiMessageParams): Promise<AiChatResult> {
  const { data, error } = await supabase.functions.invoke<AiChatResult>("ai-chat", {
    body: {
      shop_id: shopId,
      message,
      chat_id: chatId,
      // Tarmoq uzilib qayta yuborilsa — server takroriy xabar yaratmaydi.
      client_message_id: uuidv4(),
    },
  });

  if (error) throw await parseError(error);
  if (!data) throw new AiChatError("unknown");
  return data;
}

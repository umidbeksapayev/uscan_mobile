import { fetch as streamFetch } from "expo/fetch";

import { supabase } from "@/lib/supabase";
import { uuidv4 } from "@/lib/uuid";
import {
  AiChatError,
  type AiChatResult,
  type AiErrorCode,
  type ProductCard,
  type Proposal,
} from "./ai-api";

/**
 * AI javobini OQIM (SSE) sifatida oladi.
 *
 * Nega `supabase.functions.invoke` emas: u javobni to'liq kutib, so'ng
 * qaytaradi — oqim yo'qoladi. Nega oddiy `fetch` emas: React Native'ning
 * `fetch` implementatsiyasida `response.body` YO'Q (oqim o'qib bo'lmaydi).
 * `expo/fetch` — WinterCG mos, `ReadableStream` beradi va yangi native
 * modul talab qilmaydi (Expo SDK ichida).
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

/** Umumiy chegara — server 30 s da uzadi, bu esa osilib qolishdan himoya. */
const TIMEOUT_MS = 45_000;

export interface StreamHandlers {
  /** Matn bo'lagi keldi — puffakka qo'shiladi. */
  onDelta: (text: string) => void;
  /** AI ma'lumot uchun funksiya chaqirdi — chip ko'rsatiladi. */
  onTool: (name: string) => void;
  /** Tool mahsulot topdi — javob matnidan oldin karta ko'rsatiladi. */
  onCards: (cards: ProductCard[]) => void;
  /** AI o'zgarish taklif qildi — tasdiq kartasi ko'rsatiladi. */
  onProposal: (proposal: Proposal) => void;
  /** Bu aylanish tool bilan tugadi — buferni tozalash kerak. */
  onReset: () => void;
}

interface StreamEvent {
  type: "delta" | "tool" | "cards" | "proposal" | "reset" | "done" | "error";
  text?: string;
  name?: string;
  cards?: ProductCard[];
  proposal?: Proposal;
  proposals?: Proposal[];
  error?: AiErrorCode;
  chat_id?: string;
  message_id?: string | null;
  tools_used?: string[];
  model?: string;
  usage?: { input: number; output: number };
  quota?: { used: number; limit: number };
}

export interface StreamAiParams {
  shopId: string;
  message: string;
  chatId?: string;
  /** Sozlamalardagi ruxsat — yozuv TAKLIF tool'lari beriladimi. */
  allowWrites?: boolean;
}

export async function streamAiMessage(
  { shopId, message, chatId, allowWrites }: StreamAiParams,
  handlers: StreamHandlers,
): Promise<AiChatResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiChatError("unknown");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await streamFetch(FUNCTION_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        shop_id: shopId,
        message,
        chat_id: chatId,
        client_message_id: uuidv4(),
        stream: true,
        allow_writes: allowWrites === true,
      }),
    });

    // Oqim boshlanmasdan xato bo'lsa — tana oddiy JSON bo'ladi.
    if (!res.ok) {
      let code: AiErrorCode = "unknown";
      let limit: number | undefined;
      try {
        const body = (await res.json()) as { error?: AiErrorCode; limit?: number };
        if (body.error) code = body.error;
        limit = body.limit;
      } catch {
        // tana o'qilmadi — "unknown" qoladi
      }
      throw new AiChatError(code, limit);
    }
    if (!res.body) throw new AiChatError("unknown");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: AiChatResult | null = null;
    let failure: AiChatError | null = null;

    const handle = (event: StreamEvent) => {
      switch (event.type) {
        case "delta":
          if (event.text) handlers.onDelta(event.text);
          break;
        case "tool":
          if (event.name) handlers.onTool(event.name);
          break;
        case "cards":
          if (event.cards?.length) handlers.onCards(event.cards);
          break;
        case "proposal":
          if (event.proposal) handlers.onProposal(event.proposal);
          break;
        case "reset":
          handlers.onReset();
          break;
        case "done":
          result = {
            chat_id: event.chat_id ?? "",
            message_id: event.message_id ?? null,
            text: event.text ?? "",
            tools_used: event.tools_used ?? [],
            cards: event.cards ?? [],
            proposals: event.proposals ?? [],
            model: event.model ?? "",
            usage: event.usage ?? { input: 0, output: 0 },
            quota: event.quota ?? { used: 0, limit: 0 },
          };
          break;
        case "error":
          failure = new AiChatError(event.error ?? "unknown");
          break;
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE hodisalari `\n` bilan ajraladi; oxirgi to'liqmas qator buferda qoladi.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          handle(JSON.parse(payload) as StreamEvent);
        } catch {
          // yarim kelgan bo'lak — e'tiborsiz
        }
      }
    }

    if (failure) throw failure;
    if (!result) throw new AiChatError("unknown");
    return result;
  } catch (e) {
    if (e instanceof AiChatError) throw e;
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new AiChatError(aborted ? "timeout" : "unknown");
  } finally {
    clearTimeout(timer);
  }
}

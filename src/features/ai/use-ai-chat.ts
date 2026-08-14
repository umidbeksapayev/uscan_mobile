import { useCallback, useRef, useState } from "react";

import { logError } from "@/lib/logger";
import { uuidv4 } from "@/lib/uuid";
import { AiChatError, rateAiMessage, type AiErrorCode, type ProductCard } from "./ai-api";
import { streamAiMessage } from "./ai-stream";

export interface AiMessage {
  id: string;
  role: "user" | "model";
  text: string;
  /** Javob tayyorlashda ishlatilgan tool'lar (faqat `model` xabarida). */
  tools?: string[];
  /** Bosiladigan mahsulot kartalari — mahsulot ekraniga o'tadi. */
  cards?: ProductCard[];
  /** Xato xabari — boshqacha ranglanadi va "qayta urinish" beradi. */
  errorCode?: AiErrorCode;
  /** `ai_messages.id` — 👍/👎 shu qatorga yoziladi (javob kelgach to'ladi). */
  serverId?: string | null;
  /** Foydalanuvchi bahosi (1 / -1). Faqat UI holati. */
  rating?: 1 | -1;
}

/**
 * Chat holati.
 *
 * Javob OQIM (SSE) bilan keladi: `model` puffagi bo'sh holda qo'shiladi va
 * matn bo'laklab to'ldiriladi. Shu sabab foydalanuvchi 6 soniya bo'sh ekranga
 * qaramaydi — birinchi so'z ~1 soniyada chiqadi.
 *
 * Xabarlar RAM'da: server tarixni `ai_messages` ga yozadi (034 migration),
 * lekin tarixni qayta yuklash UI'si hali yo'q — ekran har ochilganda yangi
 * suhbat boshlanadi. Chat ro'yxati keyingi bosqichda.
 *
 * `chatId` birinchi javobdan keyin serverdan keladi va keyingi so'rovlarga
 * qo'shiladi — shu tufayli AI oldingi savollarni eslab qoladi.
 */
export function useAiChat(shopId: string | undefined) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [pending, setPending] = useState(false);
  const chatId = useRef<string | undefined>(undefined);
  /** Xato bo'lganda qayta yuborish uchun oxirgi matn. */
  const lastText = useRef<string>("");

  /** Oqim davomida faqat bitta (joriy) puffakni yangilaydi. */
  const patch = useCallback((id: string, fn: (m: AiMessage) => AiMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const textToSend = raw.trim();
      if (!textToSend || !shopId || pending) return;

      lastText.current = textToSend;
      const modelId = uuidv4();

      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: "user", text: textToSend },
        // Bo'sh puffak — matn kelguncha ko'rinmaydi (MessageBubble `null` qaytaradi).
        { id: modelId, role: "model", text: "", tools: [] },
      ]);
      setPending(true);

      try {
        const res = await streamAiMessage(
          { shopId, message: textToSend, chatId: chatId.current },
          {
            onDelta: (chunk) => patch(modelId, (m) => ({ ...m, text: m.text + chunk })),
            onTool: (name) =>
              patch(modelId, (m) => ({ ...m, tools: [...(m.tools ?? []), name] })),
            onCards: (cards) => patch(modelId, (m) => ({ ...m, cards })),
            // Tool chaqiruvidan oldingi matn yakuniy javob emas — tozalanadi.
            onReset: () => patch(modelId, (m) => ({ ...m, text: "" })),
          },
        );

        chatId.current = res.chat_id;
        // Yakuniy matn serverdan — oqimda bo'lak yo'qolgan bo'lsa ham to'g'ri qoladi.
        patch(modelId, (m) => ({
          ...m,
          text: res.text,
          tools: res.tools_used,
          cards: res.cards,
          serverId: res.message_id,
        }));
      } catch (e) {
        logError("ai-chat", e);
        patch(modelId, (m) => ({
          ...m,
          text: "",
          tools: [],
          cards: [],
          errorCode: e instanceof AiChatError ? e.code : "unknown",
        }));
      } finally {
        setPending(false);
      }
    },
    [shopId, pending, patch],
  );

  /**
   * Javobga baho. UI darhol yangilanadi (optimistik) — server yozuvi
   * yiqilsa ham chat buzilmaydi, xato faqat jurnalga tushadi.
   */
  const rate = useCallback(
    (id: string, value: 1 | -1) => {
      let serverId: string | null | undefined;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          serverId = m.serverId;
          return { ...m, rating: value };
        }),
      );
      if (!serverId) return;
      void rateAiMessage(serverId, value).catch((e) => logError("ai-rate", e));
    },
    [],
  );

  /** Oxirgi savolni qayta yuboradi (xato puffagi o'chiriladi). */
  const retry = useCallback(() => {
    const text = lastText.current;
    if (!text || pending) return;
    // Xato puffagi + unga sabab bo'lgan savol olib tashlanadi, so'ng qaytadan.
    setMessages((prev) => prev.filter((m) => !m.errorCode).slice(0, -1));
    void send(text);
  }, [pending, send]);

  /** Yangi suhbat — kontekst ham, ro'yxat ham tozalanadi. */
  const reset = useCallback(() => {
    chatId.current = undefined;
    lastText.current = "";
    setMessages([]);
  }, []);

  return { messages, pending, send, retry, reset, rate };
}

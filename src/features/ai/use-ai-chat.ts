import { useCallback, useRef, useState } from "react";

import { logError } from "@/lib/logger";
import { uuidv4 } from "@/lib/uuid";
import { AiChatError, sendAiMessage, type AiErrorCode } from "./ai-api";

export interface AiMessage {
  id: string;
  role: "user" | "model";
  text: string;
  /** Javob tayyorlashda ishlatilgan tool'lar (faqat `model` xabarida). */
  tools?: string[];
  /** Xato xabari — boshqacha ranglanadi va "qayta urinish" beradi. */
  errorCode?: AiErrorCode;
}

/**
 * Chat holati.
 *
 * Xabarlar RAM'da: server tarixni `ai_messages` ga yozadi (034 migration),
 * lekin 1-bosqichda tarixni qayta yuklash UI'si yo'q — ekran har ochilganda
 * yangi suhbat boshlanadi. Chat ro'yxati 2-bosqichda qo'shiladi.
 *
 * `chatId` birinchi javobdan keyin server tomonidan beriladi va keyingi
 * so'rovlarga qo'shiladi — shu tufayli AI oldingi savollarni eslab qoladi.
 */
export function useAiChat(shopId: string | undefined) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [pending, setPending] = useState(false);
  const chatId = useRef<string | undefined>(undefined);
  /** Xato bo'lganda qayta yuborish uchun oxirgi matn. */
  const lastText = useRef<string>("");

  const send = useCallback(
    async (raw: string) => {
      const textToSend = raw.trim();
      if (!textToSend || !shopId || pending) return;

      lastText.current = textToSend;
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: "user", text: textToSend },
      ]);
      setPending(true);

      try {
        const res = await sendAiMessage({
          shopId,
          message: textToSend,
          chatId: chatId.current,
        });
        chatId.current = res.chat_id;
        setMessages((prev) => [
          ...prev,
          { id: uuidv4(), role: "model", text: res.text, tools: res.tools_used },
        ]);
      } catch (e) {
        logError("ai-chat", e);
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: "model",
            text: "",
            errorCode: e instanceof AiChatError ? e.code : "unknown",
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [shopId, pending],
  );

  /** Oxirgi savolni qayta yuboradi (xato puffagi o'chiriladi). */
  const retry = useCallback(() => {
    const text = lastText.current;
    if (!text || pending) return;
    // Xato puffagi + unga sabab bo'lgan savol olib tashlanadi, so'ng qaytadan.
    setMessages((prev) => {
      const withoutError = prev.filter((m) => !m.errorCode);
      return withoutError.slice(0, -1);
    });
    void send(text);
  }, [pending, send]);

  /** Yangi suhbat — kontekst ham, ro'yxat ham tozalanadi. */
  const reset = useCallback(() => {
    chatId.current = undefined;
    lastText.current = "";
    setMessages([]);
  }, []);

  return { messages, pending, send, retry, reset };
}

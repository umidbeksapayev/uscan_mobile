// Suhbat yadrosi — JSON va SSE yo'llari uchun YAGONA mantiq.
//
// `onEvent` orqali oqim hodisalari beriladi; oddiy (oqimsiz) rejimda ular
// e'tiborsiz qoldiriladi. Shu tufayli ikki yo'l ikki xil xulq berib
// qolmaydi — bug bitta joyda tuzatiladi.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { buildSystemPrompt } from "./prompt.ts";
import { functionDeclarations, runTool } from "./tools.ts";
import {
  callsOf,
  generateWithRetry,
  streamGenerate,
  textOf,
  type GeminiContent,
  type GeminiPart,
} from "./gemini.ts";

/** Gemini ⇄ tool tsikllari chegarasi — cheksiz sikl = pul yonishi. */
const MAX_TOOL_ROUNDS = 3;
/** Kontekstga olinadigan oxirgi xabarlar soni. */
const HISTORY_LIMIT = 12;
/** Shu chegaradan oshgach eski xabarlar xulosaga siqiladi. */
const SUMMARIZE_AFTER = 24;
/** Siqilgandan keyin kontekstda qoladigan so'nggi xabarlar. */
const KEEP_RECENT = 8;

export type RunEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  /** Shu aylanishdagi matn tool chaqiruvi bilan tugadi — klient buferni tozalasin. */
  | { type: "reset" };

export interface RunParams {
  sb: SupabaseClient;
  shopId: string;
  userId: string;
  message: string;
  chatId?: string;
  clientMessageId?: string | null;
  apiKey: string;
  models: string[];
  signal: AbortSignal;
  stream: boolean;
  onEvent?: (e: RunEvent) => void;
}

export interface RunResult {
  chatId: string;
  /** Saqlangan javob xabarining id'si — 👍/👎 shu qatorga yoziladi. */
  messageId: string | null;
  text: string;
  toolsUsed: string[];
  usage: { input: number; output: number };
  model: string;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Asia/Tashkent bo'yicha bugungi sana (`YYYY-MM-DD`). */
const todayTashkent = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

interface ChatRow {
  id: string;
  summary: string | null;
  summarized_upto: string | null;
}

/** Mavjud chatni oladi yoki yangisini ochadi (RLS egalikni ta'minlaydi). */
async function resolveChat(
  sb: SupabaseClient,
  shopId: string,
  userId: string,
  chatId: string | undefined,
  firstMessage: string,
): Promise<ChatRow> {
  if (isUuid(chatId)) {
    const { data } = await sb
      .from("ai_chats")
      .select("id, summary, summarized_upto")
      .eq("id", chatId)
      .maybeSingle();
    if (data?.id) return data as ChatRow;
  }

  const { data, error } = await sb
    .from("ai_chats")
    .insert({ shop_id: shopId, user_id: userId, title: firstMessage.slice(0, 60) })
    .select("id, summary, summarized_upto")
    .single();

  if (error) throw new Error(`chat_create_failed: ${error.message}`);
  return data as ChatRow;
}

/**
 * Oxirgi xabarlar Gemini formatida.
 * Xulosa qilingan qism qayta yuborilmaydi — `summarized_upto` dan keyingilar
 * olinadi, xulosaning o'zi system prompt ichiga qo'shiladi.
 */
async function loadHistory(sb: SupabaseClient, chat: ChatRow): Promise<GeminiContent[]> {
  let q = sb
    .from("ai_messages")
    .select("role, content")
    .eq("chat_id", chat.id)
    .in("role", ["user", "model"])
    .not("content", "is", null);

  if (chat.summarized_upto) q = q.gt("created_at", chat.summarized_upto);

  const { data } = await q.order("created_at", { ascending: false }).limit(HISTORY_LIMIT);

  return ((data ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({
      role: m.role === "model" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
}

/**
 * Uzun suhbatni siqish: eski xabarlar bitta xulosaga aylanadi.
 *
 * Nega kerak: har so'rovda butun tarix qayta yuboriladi, ya'ni 30-xabarli
 * suhbat 30 marta bill qilinadi. Siqish — xarajatning eng katta ushlagichi.
 * Xato bo'lsa jim o'tkazib yuboriladi: bu optimizatsiya, javob emas.
 */
async function maybeSummarize(
  sb: SupabaseClient,
  chat: ChatRow,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<void> {
  try {
    let countQuery = sb
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("chat_id", chat.id);
    if (chat.summarized_upto) countQuery = countQuery.gt("created_at", chat.summarized_upto);

    const { count } = await countQuery;
    if (!count || count < SUMMARIZE_AFTER) return;

    // Siqiladigan qism: eng eskisidan boshlab, so'nggi KEEP_RECENT tashqarida.
    let oldQuery = sb
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("chat_id", chat.id)
      .in("role", ["user", "model"])
      .not("content", "is", null);
    if (chat.summarized_upto) oldQuery = oldQuery.gt("created_at", chat.summarized_upto);

    const { data: rows } = await oldQuery
      .order("created_at", { ascending: true })
      .limit(count - KEEP_RECENT);

    const old = (rows ?? []) as { role: string; content: string; created_at: string }[];
    if (old.length === 0) return;

    const transcript = old
      .map((m) => `${m.role === "user" ? "Savol" : "Javob"}: ${m.content}`)
      .join("\n")
      .slice(0, 8000);

    const res = await generateWithRetry({
      apiKey,
      models: [model],
      system:
        "Quyidagi suhbatni o'zbek tilida 3-4 gapda xulosala. " +
        "Faqat muhim faktlar va foydalanuvchi qiziqishlari qolsin. Raqamlarni saqla.",
      contents: [{ role: "user", parts: [{ text: transcript }] }],
      tools: [],
      signal,
      maxOutputTokens: 400,
    });

    const summary = textOf(res.content);
    if (!summary) return;

    await sb
      .from("ai_chats")
      .update({
        // Oldingi xulosa ham hisobga olinadi (zanjir uzilmaydi).
        summary: chat.summary ? `${chat.summary}\n${summary}` : summary,
        summarized_upto: old[old.length - 1].created_at,
      })
      .eq("id", chat.id);
  } catch (e) {
    console.warn("summarize_skipped", String(e).slice(0, 120));
  }
}

export async function runChat(params: RunParams): Promise<RunResult> {
  const { sb, shopId, userId, message, apiKey, models, signal, stream } = params;
  const emit = params.onEvent ?? (() => {});

  const chat = await resolveChat(sb, shopId, userId, params.chatId, message);

  const [history, shopRes, catRes] = await Promise.all([
    loadHistory(sb, chat),
    sb.from("shops").select("name").eq("id", shopId).maybeSingle(),
    sb.from("categories").select("name").eq("shop_id", shopId).limit(20),
  ]);

  // Idempotency: takroriy yuborish UNIQUE indeksga urilib, xatoni yutamiz.
  await sb.from("ai_messages").insert({
    chat_id: chat.id,
    role: "user",
    content: message,
    client_message_id: params.clientMessageId ?? null,
  });

  const system = buildSystemPrompt({
    shopName: (shopRes.data?.name as string) ?? "Do'kon",
    today: todayTashkent(),
    categories: ((catRes.data ?? []) as { name: string }[]).map((c) => c.name),
    summary: chat.summary,
  });

  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: [{ text: message }] },
  ];
  const toolsUsed: string[] = [];
  let usageIn = 0;
  let usageOut = 0;
  let usedModel = models[0];
  let answer = "";

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // Oxirgi aylanishda tool berilmaydi — model matn bilan yakunlashi shart.
    const tools = round === MAX_TOOL_ROUNDS ? [] : functionDeclarations;
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    const textParts: string[] = [];
    /** Model javobining xom bo'laklari (oqim rejimida tarixga shular ketadi). */
    const rawParts: GeminiPart[] = [];

    if (stream) {
      let emitted = false;
      let lastError: unknown;

      for (const model of models) {
        // Har urinishda toza boshlanadi (yarim yig'ilgan bo'laklar qolmasin).
        rawParts.length = 0;
        calls.length = 0;
        textParts.length = 0;

        try {
          for await (const ev of streamGenerate({
            apiKey,
            model,
            system,
            contents,
            tools,
            signal,
          })) {
            if (ev.type === "usage") {
              usageIn += ev.input;
              usageOut += ev.output;
              continue;
            }

            // Bo'lak XOM holida saqlanadi — `thoughtSignature` yo'qolmasligi
            // uchun (Gemini 3.x tool tarixida uni talab qiladi).
            rawParts.push(ev.part);

            if (ev.part.text) {
              emitted = true;
              textParts.push(ev.part.text);
              emit({ type: "delta", text: ev.part.text });
            }
            if (ev.part.functionCall?.name) {
              calls.push({
                name: ev.part.functionCall.name,
                args: ev.part.functionCall.args ?? {},
              });
            }
          }
          usedModel = model;
          lastError = undefined;
          break;
        } catch (e) {
          // Matn allaqachon ketgan bo'lsa — boshqa model bilan qaytadan
          // boshlash foydalanuvchiga ikki xil javob ko'rsatardi.
          if (emitted) throw e;
          lastError = e;
        }
      }
      if (lastError) throw lastError;
    } else {
      const res = await generateWithRetry({
        apiKey,
        models,
        system,
        contents,
        tools,
        signal,
      });
      usageIn += res.usage.input;
      usageOut += res.usage.output;
      usedModel = res.model;
      // Oqim rejimidagi kabi — bo'laklar xom holida (`thoughtSignature` bilan).
      rawParts.push(...(res.content?.parts ?? []));
      const text = textOf(res.content);
      if (text) textParts.push(text);
      for (const c of callsOf(res.content)) {
        calls.push({ name: c.name, args: c.args ?? {} });
      }
    }

    if (calls.length === 0) {
      answer = textParts.join("").trim();
      break;
    }

    // Matn tool chaqiruvi bilan birga kelgan — klient buferini tozalaymiz,
    // aks holda yakuniy javob ikki marta ko'rinadi.
    if (stream && textParts.length > 0) emit({ type: "reset" });

    // Model javobi XOM bo'laklar bilan qaytariladi — `thoughtSignature`
    // yo'qolsa Gemini 3.x keyingi so'rovni 400 bilan rad etadi.
    contents.push({ role: "model", parts: rawParts });

    const responses = await Promise.all(
      calls.map(async (call) => {
        toolsUsed.push(call.name);
        emit({ type: "tool", name: call.name });
        const out = await runTool(call.name, call.args, { sb, shopId });
        return {
          functionResponse: { name: call.name, response: out as Record<string, unknown> },
        };
      }),
    );
    contents.push({ role: "user", parts: responses });
  }

  if (!answer) answer = "Kechirasiz, javob tayyorlab bo'lmadi. Qayta urinib ko'ring.";

  // `id` qaytariladi — klient shu xabarga 👍/👎 qo'ya olishi uchun.
  const { data: saved } = await sb
    .from("ai_messages")
    .insert({
      chat_id: chat.id,
      role: "model",
      content: answer,
      tool_calls: toolsUsed.length ? toolsUsed : null,
      tokens_in: usageIn,
      tokens_out: usageOut,
      model: usedModel,
    })
    .select("id")
    .single();

  await Promise.all([
    sb.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id),
    sb.rpc("ai_record_usage", {
      p_shop_id: shopId,
      p_tokens_in: usageIn,
      p_tokens_out: usageOut,
    }),
  ]);

  // Javob yuborilgandan keyin — foydalanuvchi kutmaydi.
  await maybeSummarize(sb, chat, apiKey, models[0], signal);

  return {
    chatId: chat.id,
    messageId: (saved?.id as string) ?? null,
    text: answer,
    toolsUsed,
    usage: { input: usageIn, output: usageOut },
    model: usedModel,
  };
}

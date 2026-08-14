// ai-chat — do'kon egasi uchun AI yordamchi (1-bosqich).
//
// Zanjir: RN ilova → (JWT) → Edge Function → Gemini ⇄ tool'lar → javob.
// Reja: docs/AI_ASSISTANT_PLAN_2026-08.md
//
// XAVFSIZLIK:
//  • GEMINI_API_KEY faqat shu yerda (Supabase secrets). Ilovaga chiqmaydi.
//  • Barcha DB so'rovlari FOYDALANUVCHI JWT'si bilan → RLS ishlaydi.
//    service_role kaliti bu yo'lda umuman ishlatilmaydi.
//  • Faqat do'kon egasi (`ai_consume_quota` ichida `is_shop_owner` tekshiruvi).
//  • AI faqat o'qiydi — yozadigan tool yo'q (4-bosqichda tasdiq bilan qo'shiladi).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { buildSystemPrompt } from "./prompt.ts";
import { functionDeclarations, runTool } from "./tools.ts";
import { runDiagnostics } from "./diag.ts";
import {
  callsOf,
  generateWithRetry,
  GeminiError,
  listModels,
  textOf,
  type GeminiContent,
} from "./gemini.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// Taxallus (`-latest`) ataylab: Google model nomlarini eskirtiradi va qotib
// qolgan ID bir kun 404 beradi. Modelni almashtirish uchun `GEMINI_MODEL`
// secret'ini o'zgartirish yetarli, kodga tegilmaydi.
//
// Asosiy — LITE: `--diag` o'lchovi bo'yicha oddiy flash tekin tier'da doimiy
// 503 beradi yoki 12 s ichida javob bermaydi, lite esa ~500 ms da javob beradi.
// Do'kon statistikasi savollari uchun lite quvvati yetarli.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest";
/**
 * Lite band bo'lsa — boshqa lite bilan urinamiz. `gemini-flash-latest` zaxira
 * sifatida yaroqsiz: o'lchovda u ham doimiy band chiqdi.
 */
const GEMINI_FALLBACK = Deno.env.get("GEMINI_MODEL_FALLBACK") ?? "gemini-3.1-flash-lite";

/** Kunlik so'rov limiti (do'kon + foydalanuvchi bo'yicha). */
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "100");
/** Gemini ⇄ tool tsikllari chegarasi — cheksiz sikl = pul yonishi. */
const MAX_TOOL_ROUNDS = 3;
/** Kontekstga olinadigan oxirgi xabarlar soni. */
const HISTORY_LIMIT = 12;
/** Umumiy vaqt byudjeti (Edge Function limitidan pastroq). */
const TIMEOUT_MS = 25_000;
const MAX_MESSAGE_LEN = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface Body {
  shop_id?: unknown;
  message?: unknown;
  chat_id?: unknown;
  client_message_id?: unknown;
  /** Diagnostika: kalitga ochiq modellar ro'yxati (kvota sarflamaydi). */
  list_models?: unknown;
  /** Diagnostika: har bosqichni alohida o'lchash (kvota sarflamaydi). */
  diag?: unknown;
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

// ------------------------------------------------------------------ chat ----

/** Mavjud chatni tekshiradi yoki yangisini ochadi (RLS egasini ta'minlaydi). */
async function resolveChat(
  sb: SupabaseClient,
  shopId: string,
  userId: string,
  chatId: unknown,
  firstMessage: string,
): Promise<string> {
  if (isUuid(chatId)) {
    const { data } = await sb.from("ai_chats").select("id").eq("id", chatId).maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data, error } = await sb
    .from("ai_chats")
    .insert({
      shop_id: shopId,
      user_id: userId,
      title: firstMessage.slice(0, 60),
    })
    .select("id")
    .single();

  if (error) throw new Error(`chat_create_failed: ${error.message}`);
  return data.id as string;
}

/** Oxirgi xabarlarni Gemini formatiga o'giradi (tool qatorlari — faqat audit). */
async function loadHistory(sb: SupabaseClient, chatId: string): Promise<GeminiContent[]> {
  const { data } = await sb
    .from("ai_messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .in("role", ["user", "model"])
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return ((data ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({
      role: m.role === "model" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
}

// ------------------------------------------------------------------ main ----

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!GEMINI_API_KEY) return json({ error: "gemini_key_missing" }, 500);

  // 1. Foydalanuvchi. Barcha keyingi so'rovlar shu JWT bilan → RLS.
  const authHeader = req.headers.get("Authorization") ?? "";
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  // 2. Body validatsiyasi.
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  // Diagnostika rejimi: Google model nomlarini eskirtirganda qaysi nom
  // ochiqligini bilish uchun. Autentifikatsiyadan keyin, kvotadan oldin.
  if (body.list_models === true) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);
    try {
      return json({ models: await listModels(GEMINI_API_KEY, ac.signal) });
    } catch (e) {
      const detail = e instanceof GeminiError ? e.detail : String(e);
      return json({ error: "list_models_failed", detail }, 502);
    } finally {
      clearTimeout(t);
    }
  }

  // Diagnostika: har bosqich alohida o'lchanadi (kvota sarflamaydi).
  if (body.diag === true && isUuid(body.shop_id)) {
    return json(
      await runDiagnostics({
        apiKey: GEMINI_API_KEY,
        models: [GEMINI_MODEL, GEMINI_FALLBACK],
        sb,
        shopId: body.shop_id,
      }),
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "empty_message" }, 400);
  if (message.length > MAX_MESSAGE_LEN) return json({ error: "message_too_long" }, 400);
  if (!isUuid(body.shop_id)) return json({ error: "invalid_shop_id" }, 400);
  const shopId = body.shop_id;

  // 3. Kvota + egalik tekshiruvi bitta chaqiruvda.
  //    Kvota Gemini'dan OLDIN sarflanadi — muvaffaqiyatsiz so'rov ham hisoblanadi
  //    (aks holda xatoni takrorlab limitni cheksiz aylantirish mumkin bo'lardi).
  const { data: quota, error: quotaError } = await sb.rpc("ai_consume_quota", {
    p_shop_id: shopId,
    p_limit: DAILY_LIMIT,
  });

  if (quotaError) {
    const forbidden = quotaError.message?.includes("forbidden");
    console.error("quota_failed", quotaError.message);
    return json({ error: forbidden ? "owner_only" : "quota_failed" }, forbidden ? 403 : 500);
  }

  const q = (Array.isArray(quota) ? quota[0] : quota) as
    | { allowed: boolean; used: number; day_limit: number }
    | undefined;

  if (!q?.allowed) {
    return json(
      { error: "quota_exceeded", used: q?.used ?? 0, limit: q?.day_limit ?? DAILY_LIMIT },
      429,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 4. Chat + kontekst (parallel — kechikishni kamaytiradi).
    const chatId = await resolveChat(sb, shopId, user.id, body.chat_id, message);

    const [history, shopRes, catRes] = await Promise.all([
      loadHistory(sb, chatId),
      sb.from("shops").select("name").eq("id", shopId).maybeSingle(),
      sb.from("categories").select("name").eq("shop_id", shopId).limit(20),
    ]);

    // 5. Foydalanuvchi xabarini yozish (idempotency: takroriy yuborish
    //    UNIQUE indeksga urilib, xatoni yutamiz — javob baribir beriladi).
    const clientMessageId = isUuid(body.client_message_id) ? body.client_message_id : null;
    await sb.from("ai_messages").insert({
      chat_id: chatId,
      role: "user",
      content: message,
      client_message_id: clientMessageId,
    });

    const system = buildSystemPrompt({
      shopName: (shopRes.data?.name as string) ?? "Do'kon",
      today: todayTashkent(),
      categories: ((catRes.data ?? []) as { name: string }[]).map((c) => c.name),
    });

    // 6. Gemini ⇄ tool tsikli.
    const contents: GeminiContent[] = [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];
    const toolsUsed: { name: string; args: Record<string, unknown> }[] = [];
    let usageIn = 0;
    let usageOut = 0;
    let answer = "";
    let usedModel = GEMINI_MODEL;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const result = await generateWithRetry({
        apiKey: GEMINI_API_KEY,
        models: [GEMINI_MODEL, GEMINI_FALLBACK],
        system,
        contents,
        // Oxirgi aylanishda tool bermaymiz — model matn bilan yakunlashi shart.
        tools: round === MAX_TOOL_ROUNDS ? [] : functionDeclarations,
        signal: controller.signal,
      });

      usageIn += result.usage.input;
      usageOut += result.usage.output;
      usedModel = result.model;

      const calls = callsOf(result.content);
      if (!calls.length) {
        answer = textOf(result.content);
        break;
      }

      // Model javobini tarixga qo'shamiz (functionCall bo'laklari bilan birga).
      contents.push(result.content!);

      // Parallel chaqiruvlar — barchasi bir vaqtda bajariladi.
      const responses = await Promise.all(
        calls.map(async (call) => {
          const args = call.args ?? {};
          toolsUsed.push({ name: call.name, args });
          const out = await runTool(call.name, args, { sb, shopId });
          return {
            functionResponse: {
              name: call.name,
              response: out as Record<string, unknown>,
            },
          };
        }),
      );

      contents.push({ role: "user", parts: responses });
    }

    if (!answer) answer = "Kechirasiz, javob tayyorlab bo'lmadi. Qayta urinib ko'ring.";

    // 7. Javobni saqlash + real token sarfini yozish.
    await sb.from("ai_messages").insert({
      chat_id: chatId,
      role: "model",
      content: answer,
      tool_calls: toolsUsed.length ? toolsUsed : null,
      tokens_in: usageIn,
      tokens_out: usageOut,
      model: usedModel,
    });

    await Promise.all([
      sb.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId),
      sb.rpc("ai_record_usage", {
        p_shop_id: shopId,
        p_tokens_in: usageIn,
        p_tokens_out: usageOut,
      }),
    ]);

    return json({
      chat_id: chatId,
      text: answer,
      tools_used: toolsUsed.map((t) => t.name),
      model: usedModel,
      usage: { input: usageIn, output: usageOut },
      quota: { used: q.used, limit: q.day_limit },
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      return json(
        {
          error: e.status === 429 ? "rate_limited" : "gemini_error",
          // Faqat egasi chaqira oladi, shuning uchun sababni ochiq beramiz —
          // aks holda har xatoda dashboard jurnalini titish kerak bo'ladi.
          gemini_status: e.status,
          detail: e.detail,
        },
        e.status === 429 ? 429 : 502,
      );
    }
    const aborted = e instanceof DOMException && e.name === "AbortError";
    console.error("ai_chat_failed", aborted ? "timeout" : String(e));
    return json({ error: aborted ? "timeout" : "internal_error" }, aborted ? 504 : 500);
  } finally {
    clearTimeout(timer);
  }
});

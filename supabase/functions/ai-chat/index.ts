// ai-chat — do'kon egasi uchun AI yordamchi.
//
// Zanjir: RN ilova → (JWT) → Edge Function → Gemini ⇄ tool'lar → javob.
// Reja: docs/AI_ASSISTANT_PLAN_2026-08.md
//
// Bu fayl faqat MARSHRUTLASH bilan shug'ullanadi: autentifikatsiya, kvota va
// javob shakli (JSON yoki SSE). Suhbat mantig'i — `chat-run.ts`.
//
// XAVFSIZLIK:
//  • GEMINI_API_KEY faqat shu yerda (Supabase secrets). Ilovaga chiqmaydi.
//  • Barcha DB so'rovlari FOYDALANUVCHI JWT'si bilan → RLS ishlaydi.
//    service_role kaliti bu yo'lda umuman ishlatilmaydi.
//  • Faqat do'kon egasi (`ai_consume_quota` ichida `is_shop_owner` tekshiruvi).
//  • AI faqat o'qiydi — yozadigan tool yo'q.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { GeminiError, listModels } from "./gemini.ts";
import { runChat, type RunEvent } from "./chat-run.ts";
import { runDiagnostics } from "./diag.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Taxallus (`-latest`) ataylab: Google model nomlarini eskirtiradi va qotib
// qolgan ID bir kun 404 beradi. Modelni almashtirish uchun `GEMINI_MODEL`
// secret'ini o'zgartirish yetarli, kodga tegilmaydi.
//
// Asosiy — LITE: `--diag` o'lchovi bo'yicha oddiy flash tekin tier'da doimiy
// 503 beradi yoki 12 s ichida javob bermaydi, lite esa ~500 ms da javob beradi.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest";
/**
 * Lite band bo'lsa — boshqa lite bilan urinamiz. `gemini-flash-latest` zaxira
 * sifatida yaroqsiz: o'lchovda u ham doimiy band chiqdi.
 */
const GEMINI_FALLBACK = Deno.env.get("GEMINI_MODEL_FALLBACK") ?? "gemini-3.1-flash-lite";

/** Kunlik so'rov limiti (do'kon + foydalanuvchi bo'yicha). */
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "100");
/** Umumiy vaqt byudjeti (Edge Function limitidan pastroq). */
const TIMEOUT_MS = 30_000;
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
  /** Javobni SSE oqimi sifatida olish. */
  stream?: unknown;
  /** Diagnostika: kalitga ochiq modellar ro'yxati (kvota sarflamaydi). */
  list_models?: unknown;
  /** Diagnostika: har bosqichni alohida o'lchash (kvota sarflamaydi). */
  diag?: unknown;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Gemini xatosini HTTP javobiga o'giradi. */
function errorResponse(e: unknown, aborted: boolean) {
  if (e instanceof GeminiError) {
    return json(
      {
        error: e.status === 429 ? "rate_limited" : "gemini_error",
        // Faqat egasi chaqira oladi, shuning uchun sababni ochiq beramiz.
        gemini_status: e.status,
        detail: e.detail,
      },
      e.status === 429 ? 429 : 502,
    );
  }
  console.error("ai_chat_failed", aborted ? "timeout" : String(e));
  return json({ error: aborted ? "timeout" : "internal_error" }, aborted ? 504 : 500);
}

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
  if (!isUuid(body.shop_id)) return json({ error: "invalid_shop_id" }, 400);
  const shopId = body.shop_id;
  const models = [GEMINI_MODEL, GEMINI_FALLBACK];

  // 3. Diagnostika yo'llari — kvota sarflamaydi.
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

  if (body.diag === true) {
    return json(await runDiagnostics({ apiKey: GEMINI_API_KEY, models, sb, shopId }));
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "empty_message" }, 400);
  if (message.length > MAX_MESSAGE_LEN) return json({ error: "message_too_long" }, 400);

  // 4. Kvota + egalik tekshiruvi bitta chaqiruvda.
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

  const runParams = {
    sb,
    shopId,
    userId: user.id,
    message,
    chatId: isUuid(body.chat_id) ? body.chat_id : undefined,
    clientMessageId: isUuid(body.client_message_id) ? body.client_message_id : null,
    apiKey: GEMINI_API_KEY,
    models,
    signal: controller.signal,
  };

  // 5a. Oddiy (oqimsiz) javob.
  if (body.stream !== true) {
    try {
      const res = await runChat({ ...runParams, stream: false });
      return json({
        chat_id: res.chatId,
        message_id: res.messageId,
        text: res.text,
        tools_used: res.toolsUsed,
        model: res.model,
        usage: res.usage,
        quota: { used: q.used, limit: q.day_limit },
      });
    } catch (e) {
      return errorResponse(e, e instanceof DOMException && e.name === "AbortError");
    } finally {
      clearTimeout(timer);
    }
  }

  // 5b. SSE oqimi. Har hodisa `data: {...}\n\n` ko'rinishida ketadi.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controllerOut) {
      const send = (event: Record<string, unknown>) => {
        controllerOut.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const res = await runChat({
          ...runParams,
          stream: true,
          onEvent: (e: RunEvent) => send(e),
        });
        send({
          type: "done",
          chat_id: res.chatId,
          message_id: res.messageId,
          text: res.text,
          tools_used: res.toolsUsed,
          model: res.model,
          usage: res.usage,
          quota: { used: q.used, limit: q.day_limit },
        });
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        console.error("ai_stream_failed", aborted ? "timeout" : String(e));
        send({
          type: "error",
          error:
            e instanceof GeminiError
              ? e.status === 429
                ? "rate_limited"
                : "gemini_error"
              : aborted
                ? "timeout"
                : "internal_error",
          // Diagnostika uchun (faqat egasi ko'radi) — sababni topish
          // dashboard jurnalisiz mumkin bo'lsin.
          gemini_status: e instanceof GeminiError ? e.status : undefined,
          detail: e instanceof GeminiError ? e.detail : String(e).slice(0, 200),
        });
      } finally {
        clearTimeout(timer);
        controllerOut.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

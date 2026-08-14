// Diagnostika — qaysi bosqich sekinlashayotgani yoki yiqilayotganini
// TAXMIN QILMASDAN o'lchaydi. Har probe alohida vaqt va xato bilan qaytadi.
//
// Ishlatish: `npm run ai:test -- --diag`
// Bu yo'l kvota sarflamaydi va chat tarixiga yozmaydi.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { generateContent, GeminiError, textOf } from "./gemini.ts";
import { functionDeclarations, runTool } from "./tools.ts";

interface Step {
  name: string;
  ok: boolean;
  ms: number;
  info: string;
}

/** Har probe uchun alohida chegara — biri qotsa qolganlari baribir o'lchanadi. */
const PROBE_TIMEOUT_MS = 12_000;

async function timed(name: string, fn: () => Promise<string>): Promise<Step> {
  const started = Date.now();
  try {
    const info = await fn();
    return { name, ok: true, ms: Date.now() - started, info };
  } catch (e) {
    const info =
      e instanceof GeminiError
        ? `${e.status}: ${e.detail}`
        : e instanceof DOMException && e.name === "AbortError"
          ? `${PROBE_TIMEOUT_MS} ms ichida javob bermadi`
          : String(e).slice(0, 200);
    return { name, ok: false, ms: Date.now() - started, info };
  }
}

interface DiagOptions {
  apiKey: string;
  models: string[];
  sb: SupabaseClient;
  shopId: string;
}

export async function runDiagnostics(opts: DiagOptions): Promise<{ steps: Step[] }> {
  const steps: Step[] = [];

  const askGemini = (
    model: string,
    thinking: Record<string, unknown> | null,
    withTools: boolean,
  ) =>
    async () => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
      try {
        const r = await generateContent({
          apiKey: opts.apiKey,
          model,
          system: "Faqat o'zbek tilida javob ber.",
          contents: [{ role: "user", parts: [{ text: "Salom deb javob ber." }] }],
          tools: withTools ? functionDeclarations : [],
          signal: ac.signal,
          thinkingOverride: thinking,
          attemptTimeoutMs: PROBE_TIMEOUT_MS,
          maxOutputTokens: 256,
        });
        const text = textOf(r.content);
        return `finish=${r.finishReason ?? "-"} matn=${text.length} belgi ` +
          `token=${r.usage.input}/${r.usage.output}` +
          (text ? ` "${text.slice(0, 40)}"` : "");
      } finally {
        clearTimeout(timer);
      }
    };

  // 1-3. Gemini: eng sodda so'rovdan boshlab, fikrlash variantlari bo'yicha.
  //      Qaysi biri ishlashi va qancha vaqt olishi shu yerda ko'rinadi.
  const model = opts.models[0];
  steps.push(await timed(`${model} · fikrlashsiz`, askGemini(model, null, false)));
  steps.push(
    await timed(`${model} · thinkingLevel=low`, askGemini(model, { thinkingLevel: "low" }, false)),
  );
  steps.push(
    await timed(`${model} · thinkingBudget=0`, askGemini(model, { thinkingBudget: 0 }, false)),
  );

  // 4. Tool sxemasi so'rovni buzmayaptimi?
  steps.push(await timed(`${model} · 5 tool sxemasi`, askGemini(model, null, true)));

  // 5. Zaxira model.
  if (opts.models[1]) {
    steps.push(
      await timed(`${opts.models[1]} · fikrlashsiz`, askGemini(opts.models[1], null, false)),
    );
  }

  // 6. Barcha tool'lar — RPC mavjudligini va tezligini tekshiradi.
  //    (Migration 030/031 shared DB'ga qo'llanmagan bo'lishi mumkin.)
  const ctx = { sb: opts.sb, shopId: opts.shopId };
  const probes: [string, Record<string, unknown>][] = [
    ["search_products", { query: "a", limit: 3 }],
    ["get_today_sales", {}],
    ["get_sales_stats", { days: 7 }],
    ["get_top_products", { days: 30, limit: 3 }],
    ["get_low_stock", {}],
    ["get_product_details", { name: "a" }],
    ["get_sales_trend", { days: 7 }],
    ["get_slow_products", { days: 30, limit: 3 }],
    ["get_inventory_summary", {}],
    ["get_reorder_suggestions", { days: 30, limit: 3 }],
  ];

  for (const [tool, args] of probes) {
    steps.push(
      await timed(`DB · ${tool}`, async () => {
        const out = await runTool(tool, args, ctx);
        const text = JSON.stringify(out);
        // Tool o'z ichida xatoni yutadi — bu yerda uni ko'rinadigan qilamiz.
        if (text.includes('"error"')) throw new Error(text.slice(0, 150));
        return text.slice(0, 110);
      }),
    );
  }

  return { steps };
}

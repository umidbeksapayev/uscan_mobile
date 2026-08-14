// Kunlik xulosa — proaktiv AI (5-bosqich).
//
// Chatdan farqi: bu yerda TOOL CHAQIRUVI YO'Q. Kerakli to'rtta ma'lumot
// oldindan ma'lum, shuning uchun server ularni o'zi oladi va Gemini'ga
// BITTA so'rov yuboradi. Sabab:
//   • tez — bitta chaqiruv, tool tsikli yo'q (~1 s)
//   • arzon — tool deklaratsiyalari (~900 token) umuman yuborilmaydi
//   • barqaror — model "qaysi funksiyani chaqiray" deb adashmaydi
//
// Natija `ai_insights` da kuniga bir marta keshlanadi: ilova kun davomida
// ko'p marta ochiladi, xulosa esa bir marta hisoblanishi kerak.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { generateWithRetry, textOf } from "./gemini.ts";
import { runTool } from "./tools.ts";

/** Xulosa uzunligi — Bosh ekrandagi karta 2-3 gapdan oshmasin. */
const MAX_TOKENS = 300;

const SYSTEM = [
  "Sen do'kon egasining yordamchisisan. Berilgan raqamlar asosida 2-3 gaplik",
  "qisqa xulosa yoz. Faqat o'zbek tilida.",
  "QOIDALAR:",
  "1. Eng muhim o'zgarishni yoki e'tibor talab qiladigan narsani ayt.",
  "2. Umumiy maqtov yoki 'ishlaringiz yaxshi' kabi bo'sh gaplar YOZMA.",
  "3. Pulni bo'sh joy bilan yoz: 2 450 000 so'm.",
  "4. Berilmagan raqamni O'YLAB TOPMA.",
  "5. Savdo tushgan yoki tovar tugayotgan bo'lsa — buni birinchi ayt.",
  "6. `running_out` da `days_left` kichik bo'lsa, tovar nomi va necha kunga",
  "   yetishini ayt (masalan: 'Coca-Cola 3 kunga yetadi').",
].join("\n");

export interface InsightResult {
  text: string;
  cached: boolean;
}

/** Asia/Tashkent bo'yicha bugungi sana (`YYYY-MM-DD`). */
const todayTashkent = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export async function buildInsight(opts: {
  sb: SupabaseClient;
  shopId: string;
  apiKey: string;
  models: string[];
  signal: AbortSignal;
  /** Keshni chetlab o'tish (tortib yangilash). */
  refresh?: boolean;
  /**
   * Yangi xulosa hisoblanishidan OLDIN chaqiriladi (kvota). Keshdan
   * qaytganda chaqirilmaydi — ilovani ochish kvota yemasin.
   */
  beforeGenerate?: () => Promise<void>;
}): Promise<InsightResult> {
  const { sb, shopId, apiKey, models, signal } = opts;
  const day = todayTashkent();

  if (!opts.refresh) {
    const { data } = await sb
      .from("ai_insights")
      .select("text")
      .eq("shop_id", shopId)
      .eq("day", day)
      .maybeSingle();
    if (data?.text) return { text: data.text as string, cached: true };
  }

  await opts.beforeGenerate?.();

  // To'rtta manba — parallel. Tool qatlami qayta ishlatiladi: bir xil
  // filtrlar (cost_price yo'q, qatorlar cheklangan) shu yerda ham amal qiladi.
  const ctx = { sb, shopId };
  const [today, week, low, top, reorder] = await Promise.all([
    runTool("get_today_sales", {}, ctx),
    runTool("get_sales_stats", { days: 7 }, ctx),
    runTool("get_low_stock", {}, ctx),
    runTool("get_top_products", { days: 7, limit: 3 }, ctx),
    // Sotuv tezligiga qarab tugash muddati — xulosaning eng amaliy qismi.
    runTool("get_reorder_suggestions", { days: 30, limit: 3 }, ctx),
  ]);

  const facts = JSON.stringify({
    today,
    week_7d: week,
    low_stock: low,
    top_7d: top,
    running_out: reorder,
  });

  const res = await generateWithRetry({
    apiKey,
    models,
    system: SYSTEM,
    contents: [{ role: "user", parts: [{ text: `Do'kon raqamlari:\n${facts}` }] }],
    tools: [],
    signal,
    maxOutputTokens: MAX_TOKENS,
  });

  const text = textOf(res.content);
  if (!text) return { text: "", cached: false };

  // Kesh — `upsert`, chunki bir vaqtda ikki qurilmadan so'ralishi mumkin.
  await sb.from("ai_insights").upsert(
    {
      shop_id: shopId,
      day,
      text,
      model: res.model,
      tokens_in: res.usage.input,
      tokens_out: res.usage.output,
    },
    { onConflict: "shop_id,day" },
  );

  return { text, cached: false };
}

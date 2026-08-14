// Tool qatlami — Gemini chaqira oladigan YAGONA yo'l.
//
// Xavfsizlik tamoyillari (docs/AI_ASSISTANT_PLAN_2026-08.md, 5-bo'lim):
//  1. WHITELIST — bu yerda yo'q funksiya Gemini uchun umuman mavjud emas.
//  2. VALIDATSIYA — har argument clamp qilinadi (limit, kunlar soni).
//  3. QISQARTIRISH — natija MAX_ROWS qatordan oshmaydi (token portlashi).
//  4. RLS — chaqiruv foydalanuvchi JWT'si bilan ketadi, service_role YO'Q.
//
// 1-bosqichda `cost_price` / foyda maydonlari ataylab yuborilmaydi: tekin
// tier'da ma'lumot Google tomonidan ko'rilishi mumkin, tan narx esa do'konning
// eng maxfiy raqami. Pullik tier'ga o'tgach 3-bosqichda ochiladi.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Bitta tool natijasida Gemini'ga ketadigan maksimal qator soni. */
const MAX_ROWS = 20;

export interface ToolContext {
  sb: SupabaseClient;
  shopId: string;
}

type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<unknown>;

// --------------------------------------------------------------- yordamchi --

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

/**
 * ilike wildcardlarini literal belgiga aylantiradi.
 * `src/lib/escape-like.ts` ning nusxasi — Edge Function alohida bundle
 * bo'lgani uchun ilova kodidan import qilib bo'lmaydi.
 */
const escapeLike = (term: string): string => term.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** Natijani qisqartirib, Gemini'ga "yana bor" ekanini bildiradi. */
const clip = <T>(rows: T[]) =>
  rows.length > MAX_ROWS
    ? { rows: rows.slice(0, MAX_ROWS), truncated: true, total: rows.length }
    : { rows, truncated: false, total: rows.length };

const unwrap = <T>({ data, error }: { data: T; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data;
};

// ------------------------------------------------------- deklaratsiyalar ----
// Gemini shu tavsiflarni o'qib qaror qiladi — ular qanchalik aniq bo'lsa,
// model shunchalik kam adashadi.

export const functionDeclarations = [
  {
    name: "search_products",
    description:
      "Mahsulotni nomi bo'yicha qidiradi. Narx, qoldiq va shtrix-kodni qaytaradi. " +
      "Foydalanuvchi biror tovar haqida so'raganda ishlatiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Mahsulot nomi yoki uning bir qismi" },
        limit: { type: "INTEGER", description: "Nechta natija (1-20, standart 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_today_sales",
    description:
      "Bugungi savdo xulosasi: tushum, sotuvlar soni, kam qolgan mahsulotlar soni. " +
      "'Bugun qancha sotdik?' kabi savollar uchun.",
    // Argumentsiz funksiyada `parameters` UMUMAN yozilmaydi — Gemini bo'sh
    // `properties: {}` bo'lgan sxemani 400 bilan rad etadi.
  },
  {
    name: "get_sales_stats",
    description:
      "Davr bo'yicha savdo statistikasi: tushum, sotuvlar soni, o'rtacha chek " +
      "va oldingi shu davr bilan solishtirish. Hafta/oy savollari uchun.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Necha kunlik davr (1-365, standart 7)" },
      },
    },
  },
  {
    name: "get_top_products",
    description:
      "Eng ko'p sotilgan mahsulotlar reytingi (sotilgan miqdor va tushum bo'yicha).",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Necha kunlik davr (1-365, standart 30)" },
        limit: { type: "INTEGER", description: "Nechta mahsulot (1-20, standart 5)" },
      },
    },
  },
  {
    name: "get_low_stock",
    description:
      "Qoldig'i ogohlantirish chegarasiga tushgan mahsulotlar ro'yxati. " +
      "'Nima tugab qolyapti?' kabi savollar uchun.",
    // Argumentsiz — yuqoridagi izohga qarang.
  },
];

// -------------------------------------------------------------- ijrochilar --

const handlers: Record<string, ToolHandler> = {
  async search_products(args, { sb, shopId }) {
    const raw = typeof args.query === "string" ? args.query.trim() : "";
    if (!raw) return { error: "query bo'sh" };
    const limit = clampInt(args.limit, 1, MAX_ROWS, 10);

    const data = unwrap(
      await sb
        .from("products")
        // cost_price ataylab YO'Q — yuqoridagi izohga qarang.
        .select("name, selling_price, quantity, sale_type, barcode")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .ilike("name", `%${escapeLike(raw.slice(0, 60))}%`)
        .order("name")
        .limit(limit),
    );
    return clip(data ?? []);
  },

  async get_today_sales(_args, { sb, shopId }) {
    const data = unwrap(await sb.rpc("get_dashboard_stats", { p_shop_id: shopId }));
    const d = (data ?? {}) as Record<string, unknown>;
    // Faqat kerakli maydonlar — RPC kelajakda kengaysa ham token o'smaydi.
    return {
      today_revenue: d.today_revenue ?? 0,
      today_sales_count: d.today_sales_count ?? d.sales_count ?? 0,
      low_stock_count: d.low_stock_count ?? 0,
    };
  },

  async get_sales_stats(args, { sb, shopId }) {
    const days = clampInt(args.days, 1, 365, 7);
    const data = unwrap(
      await sb.rpc("get_sales_stats", { p_shop_id: shopId, p_days: days }),
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      days,
      revenue: d.revenue ?? 0,
      sales_count: d.sales_count ?? 0,
      avg_check: d.avg_check ?? 0,
      prev_revenue: d.prev_revenue ?? 0,
      prev_sales_count: d.prev_sales_count ?? 0,
    };
  },

  async get_top_products(args, { sb, shopId }) {
    const days = clampInt(args.days, 1, 365, 30);
    const limit = clampInt(args.limit, 1, MAX_ROWS, 5);
    const data = unwrap(
      await sb.rpc("get_top_products", {
        p_shop_id: shopId,
        p_days: days,
        p_limit: limit,
      }),
    );
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      days,
      ...clip(
        rows.map((r) => ({
          name: r.name,
          units_sold: r.units_sold,
          revenue: r.revenue,
        })),
      ),
    };
  },

  async get_low_stock(_args, { sb, shopId }) {
    // ASOSIY: `get_low_stock_products` RPC (migration 031).
    // FALLBACK: 031 shared DB'ga hali qo'llanmagan bo'lsa — client filtri,
    // `cost_price`siz (ilovadagi `dashboard-api.ts` bilan bir xil naqsh).
    const rpc = await sb.rpc("get_low_stock_products", { p_shop_id: shopId });
    let data = rpc.data;

    if (rpc.error) {
      const missing =
        rpc.error.code === "PGRST202" ||
        /could not find the function|does not exist/i.test(rpc.error.message);
      if (!missing) throw new Error(rpc.error.message);

      const fb = unwrap(
        await sb
          .from("products")
          .select("name, quantity, low_stock_alert, sale_type")
          .eq("shop_id", shopId)
          .eq("is_active", true)
          .order("quantity", { ascending: true })
          .limit(200),
      );
      data = ((fb ?? []) as Record<string, unknown>[]).filter(
        (p) => Number(p.quantity) <= Number(p.low_stock_alert),
      );
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    return clip(
      rows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        low_stock_alert: r.low_stock_alert,
        sale_type: r.sale_type,
      })),
    );
  },
};

/**
 * Gemini so'ragan funksiyani bajaradi.
 * Noma'lum nom yoki ijro xatosi Gemini'ga `{ error }` bo'lib qaytadi —
 * so'rov yiqilmaydi, model xatoni odam tilida tushuntiradi.
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) return { error: `noma'lum funksiya: ${name}` };

  try {
    return await handler(args ?? {}, ctx);
  } catch (e) {
    const detail = String(e instanceof Error ? e.message : e).slice(0, 150);
    console.error("tool_failed", name, detail);
    // `detail` Gemini'ga ham ketadi — bu ataylab: model xatoni tushunib,
    // foydalanuvchiga to'g'ri javob beradi, va `--diag` da sabab ko'rinadi.
    return { error: "ma'lumotni olishda xatolik", detail };
  }
}

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

/**
 * Klientga ketadigan bosiladigan mahsulot kartasi.
 *
 * `id` FAQAT klientga boradi — Gemini'ga UUID yuborish token isrofi va
 * modelga foydasi yo'q (u nom bilan ishlaydi). Shu sabab tool natijasi
 * ikkiga bo'linadi: model uchun matn, klient uchun kartalar.
 */
export interface ProductCard {
  id: string;
  name: string;
  price?: number;
  qty?: number;
}

/**
 * AI taklif qilgan o'zgarish. Server uni BAJARMAYDI — faqat `ai_actions` ga
 * `proposed` holatida yozadi va klientga uzatadi. O'zgarishni foydalanuvchi
 * tasdiqlagach ilovaning o'zi bajaradi (migration 036 dagi izohga qarang).
 */
export interface Proposal {
  action_id: string;
  action: "update_price" | "update_stock";
  product_id: string;
  product_name: string;
  old_value: number;
  new_value: number;
}

export interface ToolContext {
  sb: SupabaseClient;
  shopId: string;
  /** Tool topgan mahsulotlar — chat ostida bosiladigan karta bo'lib chiqadi. */
  onCards?: (cards: ProductCard[]) => void;
  /** Taklif tayyor — chat ostida tasdiq kartasi bo'lib chiqadi. */
  onProposal?: (proposal: Proposal) => void;
  /** `ai_actions` yozuvi uchun. */
  chatId?: string;
  userId?: string;
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
  {
    name: "get_product_details",
    description:
      "Bitta mahsulot haqida to'liq ma'lumot: narx, qoldiq, ogohlantirish " +
      "chegarasi, shtrix-kod, kategoriya. Nom bo'yicha eng mos mahsulot topiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Mahsulot nomi yoki uning bir qismi" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_sales_trend",
    description:
      "Kunlik savdo dinamikasi: har kun uchun tushum va sotuvlar soni. " +
      "'Qaysi kun ko'p sotdik?', 'savdo o'symoqdami?' kabi savollar uchun.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Necha kunlik davr (1-30, standart 7)" },
      },
    },
  },
  {
    name: "get_slow_products",
    description:
      "Sekin sotilayotgan (qotib qolgan) mahsulotlar: davr ichida eng kam " +
      "sotilganlar. Chegirma yoki buyurtmani kamaytirish qarori uchun.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Necha kunlik davr (1-365, standart 30)" },
        limit: { type: "INTEGER", description: "Nechta mahsulot (1-20, standart 5)" },
      },
    },
  },
  {
    name: "get_inventory_summary",
    description:
      "Ombor holati: faol mahsulotlar soni, chakana narxdagi umumiy qiymat, " +
      "kam qolgan va tugagan mahsulotlar soni.",
    // Argumentsiz.
  },
];

/**
 * Yozuv TAKLIFLARI — faqat Sozlamalarda ruxsat berilganda beriladi.
 *
 * Tavsifda "taklif qilasan, o'zgartirmaysan" ochiq yozilgan: model
 * foydalanuvchiga "bajardim" deb aytmasligi kerak.
 */
const writeDeclarations = [
  {
    name: "propose_price_change",
    description:
      "Mahsulot sotuv narxini o'zgartirishni TAKLIF qiladi. Sen o'zgartira " +
      "olmaysan — foydalanuvchi chatda tasdiqlagach ilova bajaradi. " +
      "Javobda 'taklif tayyor, tasdiqlang' deb yoz, 'o'zgartirdim' DEMA.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_name: { type: "STRING", description: "Mahsulot nomi" },
        new_price: { type: "NUMBER", description: "Yangi sotuv narxi (so'm)" },
      },
      required: ["product_name", "new_price"],
    },
  },
  {
    name: "propose_stock_change",
    description:
      "Mahsulot qoldig'ini to'g'rilashni TAKLIF qiladi (inventarizatsiya). " +
      "Sen o'zgartira olmaysan — foydalanuvchi tasdiqlagach ilova bajaradi. " +
      "Javobda 'taklif tayyor, tasdiqlang' deb yoz, 'o'zgartirdim' DEMA.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_name: { type: "STRING", description: "Mahsulot nomi" },
        new_quantity: {
          type: "NUMBER",
          description: "Yangi qoldiq (donali — butun son, vaznli — kg)",
        },
      },
      required: ["product_name", "new_quantity"],
    },
  },
];

/**
 * Modelga beriladigan tool ro'yxati.
 *
 * Ruxsat yo'q bo'lsa yozuv tool'lari RO'YXATGA UMUMAN KIRMAYDI — "iltimos
 * o'zgartirma" deb promptda yozishdan ancha ishonchli: mavjud bo'lmagan
 * funksiyani chaqirib bo'lmaydi.
 */
export const declarationsFor = (allowWrites: boolean) =>
  allowWrites ? [...functionDeclarations, ...writeDeclarations] : functionDeclarations;

// -------------------------------------------------------------- ijrochilar --

const handlers: Record<string, ToolHandler> = {
  async search_products(args, { sb, shopId, onCards }) {
    const raw = typeof args.query === "string" ? args.query.trim() : "";
    if (!raw) return { error: "query bo'sh" };
    const limit = clampInt(args.limit, 1, MAX_ROWS, 10);

    const data = unwrap(
      await sb
        .from("products")
        // cost_price ataylab YO'Q — yuqoridagi izohga qarang.
        .select("id, name, selling_price, quantity, sale_type, barcode")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .ilike("name", `%${escapeLike(raw.slice(0, 60))}%`)
        .order("name")
        .limit(limit),
    );

    const rows = (data ?? []) as Record<string, unknown>[];
    onCards?.(
      rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        price: Number(r.selling_price),
        qty: Number(r.quantity),
      })),
    );

    // Modelga `id`siz — UUID unga kerak emas, faqat token yeydi.
    return clip(
      rows.map(({ id: _id, ...rest }) => rest),
    );
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

  async get_top_products(args, { sb, shopId, onCards }) {
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
    onCards?.(
      rows.map((r) => ({ id: r.product_id as string, name: r.name as string })),
    );
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

  async get_low_stock(_args, { sb, shopId, onCards }) {
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
          .select("id, name, quantity, low_stock_alert, sale_type")
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
    onCards?.(
      rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        qty: Number(r.quantity),
      })),
    );
    return clip(
      rows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        low_stock_alert: r.low_stock_alert,
        sale_type: r.sale_type,
      })),
    );
  },

  async get_product_details(args, { sb, shopId, onCards }) {
    const raw = typeof args.name === "string" ? args.name.trim() : "";
    if (!raw) return { error: "nom bo'sh" };

    const data = unwrap(
      await sb
        .from("products")
        // cost_price YO'Q — yuqoridagi izohga qarang.
        .select("id, name, selling_price, quantity, low_stock_alert, sale_type, barcode, categories(name)")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .ilike("name", `%${escapeLike(raw.slice(0, 60))}%`)
        // Eng mos nom — qisqasi (uzun nomda qidiruv so'zi tasodifan uchraydi).
        .order("name")
        .limit(1),
    );

    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (!row) return { error: "mahsulot topilmadi", query: raw };

    const category = row.categories as { name?: string } | null;
    onCards?.([
      {
        id: row.id as string,
        name: row.name as string,
        price: Number(row.selling_price),
        qty: Number(row.quantity),
      },
    ]);
    return {
      name: row.name,
      selling_price: row.selling_price,
      quantity: row.quantity,
      low_stock_alert: row.low_stock_alert,
      sale_type: row.sale_type,
      barcode: row.barcode,
      category: category?.name ?? null,
      is_low_stock: Number(row.quantity) <= Number(row.low_stock_alert),
    };
  },

  async get_sales_trend(args, { sb, shopId }) {
    // 30 kundan uzun qator token jihatidan qimmat va savolga foyda bermaydi.
    const days = clampInt(args.days, 1, 30, 7);
    const data = unwrap(
      await sb.rpc("get_sales_trend", { p_shop_id: shopId, p_days: days }),
    );
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      days,
      // `profit` ataylab tashlanadi (tan narxdan hisoblanadi).
      rows: rows.map((r) => ({
        day: r.day,
        revenue: r.revenue,
        sales_count: r.sales_count,
      })),
    };
  },

  async get_slow_products(args, { sb, shopId, onCards }) {
    const days = clampInt(args.days, 1, 365, 30);
    const limit = clampInt(args.limit, 1, MAX_ROWS, 5);
    const data = unwrap(
      await sb.rpc("get_slow_products", {
        p_shop_id: shopId,
        p_days: days,
        p_limit: limit,
      }),
    );
    const rows = (data ?? []) as Record<string, unknown>[];
    onCards?.(
      rows.map((r) => ({ id: r.product_id as string, name: r.name as string })),
    );
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

  async propose_price_change(args, ctx) {
    return proposeChange("update_price", args, ctx);
  },

  async propose_stock_change(args, ctx) {
    return proposeChange("update_stock", args, ctx);
  },

  async get_inventory_summary(_args, { sb, shopId }) {
    const data = unwrap(await sb.rpc("get_inventory_stats", { p_shop_id: shopId }));
    const d = (data ?? {}) as Record<string, unknown>;
    // `cost_value` va `potential_profit` ATAYIN olinmaydi — tekin tier'da
    // tan narx Google tomonidan ko'rilishi mumkin (rejadagi qaror).
    return {
      product_count: d.product_count ?? 0,
      retail_value: d.retail_value ?? 0,
      low_stock_count: d.low_stock_count ?? 0,
      out_of_stock_count: d.out_of_stock_count ?? 0,
    };
  },
};

/**
 * Yozuv taklifi — umumiy mantiq (narx va qoldiq uchun bir xil).
 *
 * Bazaga TEGMAYDI: mahsulotni topadi, qiymatni tekshiradi va `ai_actions` ga
 * `proposed` yozadi. Haqiqiy o'zgarish foydalanuvchi tasdiqlagach ilovada
 * bajariladi.
 */
async function proposeChange(
  action: Proposal["action"],
  args: Record<string, unknown>,
  { sb, shopId, chatId, userId, onProposal }: ToolContext,
): Promise<unknown> {
  const name = typeof args.product_name === "string" ? args.product_name.trim() : "";
  if (!name) return { error: "mahsulot nomi bo'sh" };

  const rawValue = action === "update_price" ? args.new_price : args.new_quantity;
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(value)) return { error: "qiymat noto'g'ri" };

  // Chegaralar: model adashsa ham bema'ni taklif yozilmasin.
  if (action === "update_price" && (value <= 0 || value > 1_000_000_000)) {
    return { error: "narx 0 dan katta va 1 mlrd dan kichik bo'lishi kerak" };
  }
  if (action === "update_stock" && (value < 0 || value > 1_000_000)) {
    return { error: "qoldiq 0 dan kichik yoki 1 000 000 dan katta bo'la olmaydi" };
  }

  const found = unwrap(
    await sb
      .from("products")
      .select("id, name, selling_price, quantity")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .ilike("name", `%${escapeLike(name.slice(0, 60))}%`)
      .limit(5),
  ) as Record<string, unknown>[] | null;

  const rows = found ?? [];
  if (rows.length === 0) return { error: "mahsulot topilmadi", query: name };
  if (rows.length > 1) {
    // Bir nechta mos kelsa — TAKLIF YOZILMAYDI. Model aniqlashtirib so'raydi.
    return {
      ambiguous: rows.map((r) => r.name),
      note: "Bir nechta mahsulot mos keldi — qaysi biri kerakligini so'ra.",
    };
  }

  const row = rows[0];
  const oldValue = Number(action === "update_price" ? row.selling_price : row.quantity);
  if (oldValue === value) {
    return { error: "qiymat allaqachon shunday", product: row.name, value };
  }

  const { data: saved, error } = await sb
    .from("ai_actions")
    .insert({
      chat_id: chatId ?? null,
      shop_id: shopId,
      user_id: userId,
      action,
      product_id: row.id,
      product_name: row.name,
      old_value: oldValue,
      new_value: value,
    })
    .select("id")
    .single();

  if (error) {
    console.error("proposal_insert_failed", error.message);
    return { error: "taklifni saqlab bo'lmadi" };
  }

  onProposal?.({
    action_id: saved.id as string,
    action,
    product_id: row.id as string,
    product_name: row.name as string,
    old_value: oldValue,
    new_value: value,
  });

  return {
    status: "proposed",
    product: row.name,
    old_value: oldValue,
    new_value: value,
    note: "Taklif tayyor. Foydalanuvchi tasdiqlamaguncha HECH NIMA o'zgarmadi.",
  };
}

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

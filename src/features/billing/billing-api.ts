import { supabase } from "@/lib/supabase";

/** `plans.limits` / `get_shop_limits()` JSON shakli — `null` = cheksiz. */
export interface PlanLimits {
  products: number | null;
  members: number | null;
  shops: number | null;
  ai_daily: number | null;
  history_days: number | null;
}

export type SubscriptionStatus = "trialing" | "active" | "expired" | "canceled";

export interface ShopPlan {
  /** Xarid qilingan reja kodi (Free'ga tushgan bo'lsa ham asl kod — masalan
   *  "sinovingiz tugadi, Pro'ga qayting" kabi xabar uchun kerak bo'ladi). */
  planCode: string;
  /** Limit hisoblashda ishlatiladigan kod — muddati o'tgan bo'lsa "free". */
  effectivePlanCode: string;
  status: SubscriptionStatus;
  expired: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  limits: PlanLimits;
}

interface RawShopLimits {
  plan_code: string;
  effective_plan_code: string;
  status: SubscriptionStatus;
  expired: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  limits: PlanLimits;
}

/** `041_subscriptions.sql` → `get_shop_limits()` RPC. */
export async function getShopLimits(shopId: string): Promise<ShopPlan> {
  const { data, error } = await supabase.rpc("get_shop_limits", { p_shop_id: shopId });
  if (error) throw new Error(error.message);

  const d = data as RawShopLimits;
  return {
    planCode: d.plan_code,
    effectivePlanCode: d.effective_plan_code,
    status: d.status,
    expired: d.expired,
    trialEndsAt: d.trial_ends_at,
    currentPeriodEnd: d.current_period_end,
    limits: d.limits,
  };
}

/**
 * Faol mahsulotlar soni — limit hisoblagichi uchun. `head: true` bilan
 * qatorlar TANLANMAYDI, faqat `count` sarlavhasi qaytadi (katalogdagi
 * to'liq ro'yxatdan mustaqil: u qidiruv/filtr bilan cheklangan bo'lishi
 * mumkin, limit esa butun do'kon bo'yicha sanaladi).
 */
export async function getActiveProductCount(shopId: string): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export interface PlanRow {
  code: string;
  nameKey: string;
  priceMonth: number;
  priceYear: number;
  limits: PlanLimits;
}

/** Taqqoslash jadvali (`app/subscription.tsx`) uchun — narx DB'da, reliz shart emas. */
export async function listPlans(): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("code, name_key, price_month, price_year, limits")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    code: p.code as string,
    nameKey: p.name_key as string,
    priceMonth: p.price_month as number,
    priceYear: p.price_year as number,
    limits: p.limits as PlanLimits,
  }));
}

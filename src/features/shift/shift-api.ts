import { supabase } from "@/lib/supabase";
import { mapExpectedCash, type CashClosure, type ExpectedCash } from "./shift-math";

/** Kutilgan naqd (oxirgi yopilishdan beri) — server hisoblaydi (030). */
export async function getExpectedCash(shopId: string): Promise<ExpectedCash> {
  const { data, error } = await supabase.rpc("get_expected_cash", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return mapExpectedCash(data);
}

/** Kassani yopish — atomar RPC (expected_cash serverda qayta hisoblanadi). */
export async function closeCashShift(params: {
  shopId: string;
  countedCash: number;
  note?: string | null;
}): Promise<CashClosure> {
  const { data, error } = await supabase.rpc("close_cash_shift", {
    p_shop_id: params.shopId,
    p_counted_cash: params.countedCash,
    p_note: params.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as CashClosure;
}

/** Oxirgi yopilishlar (RLS: do'kon a'zosi o'qiy oladi; UI kassirga o'zinikini ko'rsatadi). */
export async function getCashClosures(shopId: string, limit = 30): Promise<CashClosure[]> {
  const { data, error } = await supabase
    .from("cash_closures")
    .select("id, cashier_id, period_start, period_end, expected_cash, counted_cash, difference, note, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CashClosure[];
}

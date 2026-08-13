import { supabase } from "@/lib/supabase";
import type { CashierReportRow } from "./cashier-report-math";

/**
 * Kassir hisoboti (migration 033 — `get_cashier_report`).
 *
 * Agregatsiya SERVERDA: eski `getCashierSales` sotuv qatorlarini client'ga
 * tortib, 2000 tasi bilan cheklanib yig'ardi — real do'kon oyiga shundan
 * ko'p sotuv qiladi va hisobot jimgina noto'g'ri raqam ko'rsatardi.
 *
 * Ruxsatni RPC'ning o'zi hal qiladi: ega hamma kassirni ko'radi, kassir
 * faqat o'zini (foyda va qaytarish ustunlari `null` keladi).
 */
export async function getCashierReport(
  shopId: string,
  days: number,
): Promise<CashierReportRow[]> {
  const { data, error } = await supabase.rpc("get_cashier_report", {
    p_shop_id: shopId,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as CashierReportRow[];
}

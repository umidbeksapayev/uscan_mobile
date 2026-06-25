import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { supabase } from "@/lib/supabase";
import { TASHKENT_OFFSET_MS } from "@/lib/format";
import { buildSalesCsv, type SalesCsvRow } from "./csv-format";

/** (today − (days−1)) mahalliy yarim tunining UTC instanti (eksport oynasi). */
function periodStartIso(days: number): string {
  const nowTash = new Date(Date.now() + TASHKENT_OFFSET_MS);
  const ms =
    Date.UTC(nowTash.getUTCFullYear(), nowTash.getUTCMonth(), nowTash.getUTCDate() - (days - 1)) -
    TASHKENT_OFFSET_MS;
  return new Date(ms).toISOString();
}

export type ExportResult = "shared" | "empty" | "unavailable";

/**
 * Tanlangan davr (Bugun/Hafta/Oy) sotuvlarini CSV qilib ulashadi.
 * Faqat davr bilan cheklangan (xotira qulashining oldini olish) + max 2000 qator.
 * Foyda ustuni faqat `includeProfit` (view_cost) bo'lsa so'raladi/qo'shiladi.
 */
export async function exportPeriodSales(opts: {
  shopId: string;
  days: number;
  includeProfit: boolean;
  periodLabel: string;
}): Promise<ExportResult> {
  const cols = opts.includeProfit
    ? "sold_at, item_count, total_revenue, total_profit"
    : "sold_at, item_count, total_revenue";

  const { data, error } = await supabase
    .from("sales")
    .select(cols)
    .eq("shop_id", opts.shopId)
    .gte("sold_at", periodStartIso(opts.days))
    .order("sold_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as SalesCsvRow[];
  if (rows.length === 0) return "empty";

  // BOM — Excel UTF-8 (kiril/lotin) to'g'ri o'qishi uchun
  const csv = "﻿" + buildSalesCsv(rows, opts.includeProfit);
  const file = new File(Paths.cache, `statistika_${opts.periodLabel}_${Date.now()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Statistikani eksport (CSV)",
  });
  return "shared";
}

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { supabase } from "@/lib/supabase";
import { buildProductsCsv, type ProductCsvRow } from "./products-csv";

export type ExportResult = "shared" | "empty" | "unavailable";

interface RawRow {
  name: string;
  sale_type: "unit" | "weight";
  cost_price?: number;
  selling_price: number;
  quantity: number;
  barcode: string | null;
  category: { name: string } | null;
}

/**
 * Faol katalogni CSV qilib ulashadi (stats export-csv.ts bilan bir xil oqim).
 * `includeCost` faqat `view_cost` bo'lsa — tan narx USTUNI ham SO'ROVI ham
 * kassirda bo'lmaydi (S1: cost_price cache'ga tushmasin). Max 5000 qator.
 */
export async function exportProductsCsv(opts: {
  shopId: string;
  includeCost: boolean;
}): Promise<ExportResult> {
  const cols = opts.includeCost
    ? "name, sale_type, cost_price, selling_price, quantity, barcode, category:categories(name)"
    : "name, sale_type, selling_price, quantity, barcode, category:categories(name)";

  const { data, error } = await supabase
    .from("products")
    .select(cols)
    .eq("shop_id", opts.shopId)
    .eq("is_active", true)
    .order("name")
    .limit(5000);
  if (error) throw new Error(error.message);

  const raw = (data ?? []) as unknown as RawRow[];
  if (raw.length === 0) return "empty";

  const rows: ProductCsvRow[] = raw.map((r) => ({
    name: r.name,
    sale_type: r.sale_type,
    cost_price: r.cost_price,
    selling_price: r.selling_price,
    quantity: r.quantity,
    barcode: r.barcode,
    category: r.category?.name ?? null,
  }));

  // BOM — Excel UTF-8 (kiril/lotin) to'g'ri o'qishi uchun
  const csv = "﻿" + buildProductsCsv(rows, opts.includeCost);
  const file = new File(Paths.cache, `katalog_${Date.now()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Katalogni eksport (CSV)",
  });
  return "shared";
}

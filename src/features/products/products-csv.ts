import type { SaleType } from "@/types/database";

/**
 * Katalog CSV eksporti — sof qurish funksiyasi. Sarlavhalar import parseri
 * (`import-products.ts` HEADER_ALIASES) bilan MOS: eksport qilingan faylni
 * o'zgartirib qayta import qilish mumkin (round-trip).
 */
export interface ProductCsvRow {
  name: string;
  sale_type: SaleType;
  cost_price?: number;
  selling_price: number;
  quantity: number;
  barcode: string | null;
  category: string | null;
}

/** CSV maydonini xavfsizlaymiz (vergul/qo'shtirnoq/yangi qator) — csv-format.ts bilan bir xil. */
function esc(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Mahsulotlar ro'yxatidan CSV matni. `includeCost` faqat `view_cost` ruxsati
 * bilan true bo'ladi — tan narx ustuni kassirga chiqmaydi (S1 qoidasi).
 * Tur qiymatlari "dona"/"kg" — import `parseSaleType` sinonimlariga mos.
 */
export function buildProductsCsv(rows: ProductCsvRow[], includeCost: boolean): string {
  const header = ["Nomi", "Tur"];
  if (includeCost) header.push("Tan narxi");
  header.push("Sotish narxi", "Miqdor", "Barcode", "Kategoriya");

  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const cols = [r.name, r.sale_type === "weight" ? "kg" : "dona"];
    if (includeCost) cols.push(String(r.cost_price ?? 0));
    cols.push(String(r.selling_price), String(r.quantity), r.barcode ?? "", r.category ?? "");
    lines.push(cols.map(esc).join(","));
  }
  return lines.join("\r\n");
}

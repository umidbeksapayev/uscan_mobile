export interface SalesCsvRow {
  sold_at: string;
  item_count: number;
  total_revenue: number;
  total_profit?: number;
}

/** CSV maydonini xavfsizlaymiz (vergul/qo'shtirnoq/yangi qator). */
function esc(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** "2026-06-07T09:18:33Z" → "07.06.2026 14:18" (Asia/Tashkent). */
function fmtDate(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getUTCDate())}.${p(t.getUTCMonth() + 1)}.${t.getUTCFullYear()} ${p(
    t.getUTCHours()
  )}:${p(t.getUTCMinutes())}`;
}

/** Sotuvlar ro'yxatidan CSV matni (sof funksiya — test qilinadi). */
export function buildSalesCsv(rows: SalesCsvRow[], includeProfit: boolean): string {
  const header = ["Sana", "Mahsulot soni", "Tushum (so'm)"];
  if (includeProfit) header.push("Foyda (so'm)");
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const cols = [fmtDate(r.sold_at), String(r.item_count), String(Math.round(r.total_revenue))];
    if (includeProfit) cols.push(String(Math.round(r.total_profit ?? 0)));
    lines.push(cols.map(esc).join(","));
  }
  return lines.join("\r\n");
}

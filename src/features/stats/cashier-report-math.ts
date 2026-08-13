/**
 * Kassir hisoboti — sof funksiyalar (Supabase'siz testlanadi).
 *
 * Agregatsiyaning O'ZI serverda (`get_cashier_report`, migration 033):
 * client'da 2000 qator cheklovi bilan yig'ish real do'konda noto'g'ri raqam
 * berardi. Bu yerda faqat KO'RSATISH uchun hisob — ulush foizlari, jami
 * qatori va to'lov taqsimoti.
 */

/** RPC qatori. Qaytarish/foyda ustunlari kassirda `null` (RLS chegarasi). */
export interface CashierReportRow {
  cashier_id: string | null;
  email: string | null;
  role: string | null;
  sales_count: number;
  revenue: number;
  avg_check: number;
  cash_total: number;
  card_total: number;
  qr_total: number;
  debt_total: number;
  returns_count: number | null;
  refund_total: number | null;
  profit: number | null;
}

export type PaymentKind = "cash" | "card" | "qr" | "debt";

export interface PaymentSlice {
  kind: PaymentKind;
  amount: number;
  /** 0–100. Jami 0 bo'lsa — 0 (NaN emas). */
  percent: number;
}

export interface ReportTotals {
  salesCount: number;
  revenue: number;
  avgCheck: number;
  returnsCount: number;
  refundTotal: number;
  /** Egaga `null` emas; kassirda `null` (server bermaydi). */
  profit: number | null;
}

/** Pulni tiyinda yig'adi — float drift yo'q (cart-total uslubi). */
function sumMoney(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}

/** Ulush foizi. Jami 0 yoki manfiy bo'lsa 0 qaytaradi (NaN/Infinity emas). */
export function sharePercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

/**
 * Bitta kassirning to'lov usullari taqsimoti, summasi kamayish tartibida.
 * Nol summali usullar TASHLAB YUBORILADI — diagrammada bo'sh bo'lak
 * ko'rsatishning ma'nosi yo'q.
 */
export function paymentSplit(row: CashierReportRow): PaymentSlice[] {
  const raw: { kind: PaymentKind; amount: number }[] = [
    { kind: "cash", amount: row.cash_total },
    { kind: "card", amount: row.card_total },
    { kind: "qr", amount: row.qr_total },
    { kind: "debt", amount: row.debt_total },
  ];
  const total = sumMoney(raw.map((x) => x.amount));
  return raw
    .filter((x) => x.amount > 0)
    .map((x) => ({ ...x, percent: sharePercent(x.amount, total) }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Jami qatori.
 *
 * O'rtacha chek qatorlar o'rtachasining o'rtachasi EMAS — umumiy tushumni
 * umumiy sotuv soniga bo'lish. Ikki kassir (10 ta sotuv × 1000 va 1 ta
 * sotuv × 100000) misolida noto'g'ri usul 50 500 berardi, to'g'risi 10 000.
 */
export function reportTotals(rows: CashierReportRow[]): ReportTotals {
  const salesCount = rows.reduce((a, r) => a + r.sales_count, 0);
  const revenue = sumMoney(rows.map((r) => r.revenue));
  const returnsCount = rows.reduce((a, r) => a + (r.returns_count ?? 0), 0);
  const refundTotal = sumMoney(rows.map((r) => r.refund_total ?? 0));

  // Kassir rejimida foyda umuman kelmaydi — jami ham `null` bo'lishi kerak,
  // 0 emas (0 "foyda yo'q" degan yolg'on ma'no berardi).
  const hasProfit = rows.some((r) => r.profit !== null);
  const profit = hasProfit ? sumMoney(rows.map((r) => r.profit ?? 0)) : null;

  return {
    salesCount,
    revenue,
    avgCheck: salesCount > 0 ? Math.round((revenue / salesCount) * 100) / 100 : 0,
    returnsCount,
    refundTotal,
    profit,
  };
}

/** Qaytarish ulushi (%) — tushumga nisbatan. Nazorat ko'rsatkichi. */
export function refundRate(row: CashierReportRow): number {
  return sharePercent(row.refund_total ?? 0, row.revenue);
}

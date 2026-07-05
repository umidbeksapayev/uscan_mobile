/**
 * Kassa/smena yopish (Z-hisobot) — sof funksiyalar va tiplar.
 * Kutilgan naqd SERVER'da hisoblanadi (migration 030 `get_expected_cash`);
 * bu yerda faqat client-side kiritish/farq matematikasi (tiyin yaxlitlash).
 */

/** `get_expected_cash` natijasi (camelCase'ga o'girilgan). */
export interface ExpectedCash {
  from: string;
  to: string;
  /** Naqd sotuvlar (cash + nasiya boshlang'ich to'lovi). */
  cashSales: number;
  /** Nasiya to'lovlari (naqd deb olinadi). */
  debtPayments: number;
  /** Qaytarishlar (naqd qaytarilgan deb olinadi). */
  refunds: number;
  expectedCash: number;
}

/** `cash_closures` qatori (ro'yxat) yoki `close_cash_shift` natijasi. */
export interface CashClosure {
  id: string;
  cashier_id?: string;
  period_start: string;
  period_end: string;
  expected_cash: number;
  counted_cash: number;
  /** + ortiqcha, − kamomad. */
  difference: number;
  note: string | null;
  created_at: string;
}

/** RPC jsonb (snake_case, numeric string bo'lishi mumkin) → {@link ExpectedCash}. */
export function mapExpectedCash(row: {
  from: string;
  to: string;
  cash_sales: number | string;
  debt_payments: number | string;
  refunds: number | string;
  expected_cash: number | string;
}): ExpectedCash {
  return {
    from: row.from,
    to: row.to,
    cashSales: Number(row.cash_sales),
    debtPayments: Number(row.debt_payments),
    refunds: Number(row.refunds),
    expectedCash: Number(row.expected_cash),
  };
}

/** "1 250 000" kabi matn → so'm (bo'sh joy/vergul chidamli; noto'g'ri yoki manfiy → 0). */
export function parseAmount(text: string): number {
  const n = parseFloat(text.replace(/\s/g, "").replace(",", "."));
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Farq (sanalgan − kutilgan), tiyinda yaxlitlangan: + ortiqcha, − kamomad. */
export function closureDifference(counted: number, expected: number): number {
  return Math.round((counted - expected) * 100) / 100;
}

export type DiffStatus = "match" | "surplus" | "shortage";

/** Farq holati (UI rang/label uchun). */
export function diffStatus(difference: number): DiffStatus {
  if (difference === 0) return "match";
  return difference > 0 ? "surplus" : "shortage";
}

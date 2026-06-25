import type { SalesTrendPoint } from "@/types/database";

export interface TrendTotals {
  revenue: number;
  profit: number;
  count: number;
}

/** Trend nuqtalaridan davr yig'indilari (tushum/foyda/sotuv soni). */
export function trendTotals(points: SalesTrendPoint[]): TrendTotals {
  return points.reduce<TrendTotals>(
    (acc, d) => {
      acc.revenue += d.revenue;
      acc.profit += d.profit;
      acc.count += d.sales_count;
      return acc;
    },
    { revenue: 0, profit: 0, count: 0 },
  );
}

/** Qisqa son: 1 200 000 → "1.2M", 15 000 → "15k", 0 → "0". */
export function compactSom(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

/**
 * Grafik Y-o'qi uchun "chiroyli" maksimum (1/2/5 × 10^k ga yaxlitlanadi).
 * 0 yoki manfiyda 1 qaytaradi (nolga bo'lishdan saqlaydi).
 */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / pow; // 1..10
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

/** "2026-06-07" → "07.06" (o'q yorlig'i). */
export function dayLabel(iso: string): string {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}` : iso;
}

/**
 * 2×N kunlik trendni joriy va oldingi davrga ajratadi (foiz o'zgarish uchun).
 * current = oxirgi `days`, previous = undan oldingi `days`.
 */
export function periodSplit<T>(points: T[], days: number): { current: T[]; previous: T[] } {
  const n = points.length;
  return {
    current: points.slice(Math.max(0, n - days)),
    previous: points.slice(Math.max(0, n - 2 * days), Math.max(0, n - days)),
  };
}

/** Foiz o'zgarish (joriy vs oldingi). Oldingi 0/manfiy bo'lsa null (badge ko'rsatilmaydi). */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

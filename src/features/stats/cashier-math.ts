/**
 * Kassir bo'yicha savdo agregatsiyasi — sof funksiya (Supabase'siz testlanadi).
 * Server RPC'siz: sales qatorlari client'da guruhlash (export-csv kabi 2000
 * qator cheklovi bilan) — yangi migratsiya kerak emas.
 */

export interface CashierSaleRow {
  /** null = eski sotuvlar (cashier_id ustuni migration 016'dan oldin yo'q edi). */
  cashier_id: string | null;
  total_revenue: number;
}

export interface CashierAgg {
  cashierId: string | null;
  salesCount: number;
  revenue: number;
}

/** Kassir bo'yicha guruhlab, tushum kamayishi tartibida qaytaradi.
 *  Pul tiyinda yig'iladi (float drift yo'q — cart-total uslubi). */
export function aggregateByCashier(rows: CashierSaleRow[]): CashierAgg[] {
  const map = new Map<string | null, { count: number; tiyin: number }>();
  for (const r of rows) {
    const cur = map.get(r.cashier_id) ?? { count: 0, tiyin: 0 };
    cur.count += 1;
    cur.tiyin += Math.round(r.total_revenue * 100);
    map.set(r.cashier_id, cur);
  }
  return [...map.entries()]
    .map(([cashierId, v]) => ({ cashierId, salesCount: v.count, revenue: v.tiyin / 100 }))
    .sort((a, b) => b.revenue - a.revenue);
}

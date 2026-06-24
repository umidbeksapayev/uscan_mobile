import type { SaleType } from "@/types/database";

/** Kam-qoldiq ulushi — miqdorning 20% iga yetganда ogohlantiriladi (web bilan bir xil). */
export const LOW_STOCK_RATIO = 0.2;

/**
 * Avtomatik kam-qoldiq chegarasi (miqdorning 20%).
 * DONALI → butun songa yaxlitlanadi (yuqoriga), VAZN → kg (3 kasr).
 */
export function lowStockThreshold(quantity: number, saleType: SaleType): number {
  const raw = quantity * LOW_STOCK_RATIO;
  return saleType === "unit" ? Math.ceil(raw) : Math.round(raw * 1000) / 1000;
}

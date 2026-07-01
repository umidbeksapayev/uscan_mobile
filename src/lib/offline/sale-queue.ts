/**
 * Sotuv navbati — umumiy tip va konstanta. Haqiqiy holat o'tishlari (enqueue,
 * status almashtirish, urinish sanog'i) SQLite'da to'g'ridan-to'g'ri
 * `sale-queue-db.ts`da amalga oshiriladi (bu yerda sof funksiya ko'rinishida
 * qaytarilmaydi — audit: oldingi versiya ishlatilmaydigan ikkilamchi mantiq
 * edi, DB implementatsiyasi bilan drift xavfi tug'dirardi).
 */

export type SaleStatus = "pending" | "syncing" | "done" | "failed";

export interface QueuedSale {
  client_id: string; // = RPC p_client_id (idempotency)
  shop_id: string;
  items: { product_id: string; quantity: number }[];
  customer_id: string | null;
  paid_amount: number | null;
  method: string | null; // faqat UI/log uchun
  status: SaleStatus;
  error: string | null;
  attempt: number;
  created_at: string;
  updated_at: string;
}

export const MAX_ATTEMPTS = 5;

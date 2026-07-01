import type { Sale } from "@/types/database";
import type { ReceiptData, ReceiptLine } from "@/features/print/types";

/**
 * Tarixdagi sotuvni chek ma'lumotiga aylantiradi (qayta chop etish uchun).
 * `sales` jadvalida to'lov turi (naqd/karta/QR) alohida saqlanmaydi — faqat
 * `paid_amount` vs `total_revenue` orqali nasiya/to'liq to'langanligi bilinadi.
 * Shuning uchun aniq usul o'rniga umumiy holat ko'rsatiladi.
 */
export function buildSaleReceiptData(sale: Sale, shopName: string): ReceiptData {
  const debt = Math.max(0, sale.total_revenue - sale.paid_amount);
  const items: ReceiptLine[] = (sale.items ?? []).map((it) => ({
    name: it.product?.name ?? "—",
    saleType: it.sale_type,
    quantity: it.quantity_sold,
    unitPrice: it.selling_price_snapshot,
    lineTotal: it.total_revenue,
  }));

  return {
    shopName,
    saleId: sale.id,
    soldAt: sale.sold_at,
    items,
    totalRevenue: sale.total_revenue,
    paymentMethod: debt > 0 ? "Nasiya" : "To'landi",
    debtAmount: debt > 0 ? debt : undefined,
  };
}

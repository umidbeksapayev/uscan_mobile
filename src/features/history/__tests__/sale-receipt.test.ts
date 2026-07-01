import { buildSaleReceiptData } from "../sale-receipt";
import type { Sale } from "@/types/database";

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "sale-1",
    shop_id: "shop-1",
    customer_id: null,
    total_revenue: 45000,
    total_profit: 0,
    item_count: 2,
    paid_amount: 45000,
    search_method: "manual",
    sold_at: "2026-06-07T09:18:00Z",
    items: [
      {
        id: "item-1",
        sale_id: "sale-1",
        shop_id: "shop-1",
        product_id: "p-1",
        sale_type: "unit",
        quantity_sold: 3,
        cost_price_snapshot: 0,
        selling_price_snapshot: 15000,
        total_revenue: 45000,
        total_profit: 0,
        search_method: "manual",
        sold_at: "2026-06-07T09:18:00Z",
        product: { name: "Non", image_url: null, sale_type: "unit" },
      },
    ],
    ...overrides,
  };
}

describe("buildSaleReceiptData", () => {
  it("to'liq to'langan sotuvda 'To'landi', qarzsiz", () => {
    const data = buildSaleReceiptData(sale(), "Do'kon");
    expect(data.paymentMethod).toBe("To'landi");
    expect(data.debtAmount).toBeUndefined();
    expect(data.totalRevenue).toBe(45000);
    expect(data.items).toEqual([
      { name: "Non", saleType: "unit", quantity: 3, unitPrice: 15000, lineTotal: 45000 },
    ]);
  });

  it("qisman to'langan (nasiya) sotuvda 'Nasiya' + qarz summasi", () => {
    const data = buildSaleReceiptData(sale({ paid_amount: 10000 }), "Do'kon");
    expect(data.paymentMethod).toBe("Nasiya");
    expect(data.debtAmount).toBe(35000);
  });

  it("mahsulot nomi yo'q bo'lsa '—' ko'rsatadi", () => {
    const s = sale();
    s.items![0].product = undefined;
    const data = buildSaleReceiptData(s, "Do'kon");
    expect(data.items[0].name).toBe("—");
  });
});

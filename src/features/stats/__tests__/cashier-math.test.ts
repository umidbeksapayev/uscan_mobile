import { aggregateByCashier } from "../cashier-math";

describe("aggregateByCashier", () => {
  it("kassir bo'yicha guruhlab, tushum kamayishi tartibida", () => {
    const rows = [
      { cashier_id: "a", total_revenue: 10000 },
      { cashier_id: "b", total_revenue: 50000 },
      { cashier_id: "a", total_revenue: 20000 },
    ];
    expect(aggregateByCashier(rows)).toEqual([
      { cashierId: "b", salesCount: 1, revenue: 50000 },
      { cashierId: "a", salesCount: 2, revenue: 30000 },
    ]);
  });

  it("null cashier_id (eski sotuvlar) alohida guruh bo'ladi", () => {
    const rows = [
      { cashier_id: null, total_revenue: 5000 },
      { cashier_id: "a", total_revenue: 1000 },
      { cashier_id: null, total_revenue: 2000 },
    ];
    const res = aggregateByCashier(rows);
    expect(res[0]).toEqual({ cashierId: null, salesCount: 2, revenue: 7000 });
    expect(res[1]).toEqual({ cashierId: "a", salesCount: 1, revenue: 1000 });
  });

  it("kasr summalar tiyinda yaxlitlanadi (float drift yo'q)", () => {
    // 0.1 + 0.2 !== 0.3 muammosi — tiyin yig'ishda chiqmasligi kerak
    const rows = [
      { cashier_id: "a", total_revenue: 0.1 },
      { cashier_id: "a", total_revenue: 0.2 },
    ];
    expect(aggregateByCashier(rows)[0].revenue).toBe(0.3);
  });

  it("bo'sh ro'yxat → bo'sh natija", () => {
    expect(aggregateByCashier([])).toEqual([]);
  });
});

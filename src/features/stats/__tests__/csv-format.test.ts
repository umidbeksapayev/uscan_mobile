import { buildSalesCsv, type SalesCsvRow } from "../csv-format";

const rows: SalesCsvRow[] = [
  { sold_at: "2026-06-07T09:18:00Z", item_count: 3, total_revenue: 45000, total_profit: 12000 },
  { sold_at: "2026-06-07T05:00:00Z", item_count: 1, total_revenue: 8000, total_profit: 2000 },
];

describe("buildSalesCsv", () => {
  it("foyda bilan: sarlavha + qatorlar (Tashkent vaqti, yaxlitlangan)", () => {
    const csv = buildSalesCsv(rows, true);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Sana,Mahsulot soni,Tushum (so'm),Foyda (so'm)");
    // 09:18 UTC + 5 soat = 14:18 Tashkent
    expect(lines[1]).toBe("07.06.2026 14:18,3,45000,12000");
    expect(lines).toHaveLength(3);
  });

  it("foyda ustunisiz (kassir — view_cost yo'q)", () => {
    const csv = buildSalesCsv(rows, false);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Sana,Mahsulot soni,Tushum (so'm)");
    expect(lines[1]).toBe("07.06.2026 14:18,3,45000");
  });

  it("bo'sh ro'yxat = faqat sarlavha", () => {
    expect(buildSalesCsv([], false)).toBe("Sana,Mahsulot soni,Tushum (so'm)");
  });
});

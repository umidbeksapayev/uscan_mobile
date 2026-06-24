import { lowStockThreshold } from "../low-stock";

describe("lowStockThreshold (avtomatik 20%)", () => {
  it("DONALI: 20% ni yuqoriga yaxlitlaydi", () => {
    expect(lowStockThreshold(10, "unit")).toBe(2);
    expect(lowStockThreshold(7, "unit")).toBe(2); // 1.4 → 2
    expect(lowStockThreshold(0, "unit")).toBe(0);
  });

  it("VAZN: kg (kasrli)", () => {
    expect(lowStockThreshold(5, "weight")).toBe(1);
    expect(lowStockThreshold(2.5, "weight")).toBe(0.5);
  });
});

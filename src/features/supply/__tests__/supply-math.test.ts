import { supplyTotalCost, supplyLineCount } from "../supply-math";

describe("supplyTotalCost", () => {
  it("Σ miqdor × tan narx", () => {
    expect(
      supplyTotalCost([
        { quantity: 10, costPrice: 12000 },
        { quantity: 3, costPrice: 4000 },
      ]),
    ).toBe(132000);
  });

  it("kasrli kg ni tiyinda yaxlitlaydi (float drift yo'q)", () => {
    // 1.333 × 18000 = 23994
    expect(supplyTotalCost([{ quantity: 1.333, costPrice: 18000 }])).toBe(23994);
  });

  it("bo'sh = 0", () => {
    expect(supplyTotalCost([])).toBe(0);
  });
});

describe("supplyLineCount", () => {
  it("qatorlar soni", () => {
    expect(supplyLineCount([1, 2, 3])).toBe(3);
  });
});

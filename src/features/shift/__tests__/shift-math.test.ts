import {
  parseAmount,
  closureDifference,
  diffStatus,
  mapExpectedCash,
} from "../shift-math";

describe("parseAmount", () => {
  it("bo'sh joyli minglik: '1 250 000' → 1250000", () => {
    expect(parseAmount("1 250 000")).toBe(1250000);
  });

  it("vergul kasr: '12,5' → 12.5", () => {
    expect(parseAmount("12,5")).toBe(12.5);
  });

  it("bo'sh/noto'g'ri/manfiy → 0", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-500")).toBe(0);
  });

  it("tiyindan mayda qism yaxlitlanadi", () => {
    expect(parseAmount("100.005")).toBe(100.01);
  });
});

describe("closureDifference", () => {
  it("ortiqcha: + farq", () => {
    expect(closureDifference(105000, 100000)).toBe(5000);
  });

  it("kamomad: − farq", () => {
    expect(closureDifference(95000, 100000)).toBe(-5000);
  });

  it("float drift tiyinda yaxlitlanadi (0.1 + 0.2 muammosi)", () => {
    // 0.3 − 0.1 = 0.19999... emas, aniq 0.2 bo'lishi kerak
    expect(closureDifference(0.3, 0.1)).toBe(0.2);
  });

  it("teng → 0", () => {
    expect(closureDifference(250000, 250000)).toBe(0);
  });
});

describe("diffStatus", () => {
  it("0 → match, + → surplus, − → shortage", () => {
    expect(diffStatus(0)).toBe("match");
    expect(diffStatus(1500)).toBe("surplus");
    expect(diffStatus(-1500)).toBe("shortage");
  });
});

describe("mapExpectedCash", () => {
  it("snake_case + numeric-string → camelCase number", () => {
    const res = mapExpectedCash({
      from: "2026-07-04T00:00:00+00:00",
      to: "2026-07-04T15:30:00+00:00",
      cash_sales: "1250000.50",
      debt_payments: 200000,
      refunds: "50000",
      expected_cash: "1400000.50",
    });
    expect(res).toEqual({
      from: "2026-07-04T00:00:00+00:00",
      to: "2026-07-04T15:30:00+00:00",
      cashSales: 1250000.5,
      debtPayments: 200000,
      refunds: 50000,
      expectedCash: 1400000.5,
    });
  });
});

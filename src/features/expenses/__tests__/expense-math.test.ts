import { expensesTotal, netProfit, categoryLabel } from "../expense-math";

describe("expensesTotal", () => {
  it("yig'indi", () => {
    expect(expensesTotal([{ amount: 500000 }, { amount: 120000 }])).toBe(620000);
  });

  it("bo'sh ro'yxat → 0", () => {
    expect(expensesTotal([])).toBe(0);
  });

  it("float drift tiyinda yaxlitlanadi", () => {
    // 0.1 + 0.2 = 0.30000000000000004 emas, aniq 0.3
    expect(expensesTotal([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });
});

describe("netProfit", () => {
  it("foyda − xarajat", () => {
    expect(netProfit(1000000, 350000)).toBe(650000);
  });

  it("xarajat foydadan katta → manfiy (zarar)", () => {
    expect(netProfit(200000, 350000)).toBe(-150000);
  });

  it("tiyinda yaxlitlanadi", () => {
    expect(netProfit(0.3, 0.1)).toBe(0.2);
  });
});

describe("categoryLabel", () => {
  it("ma'lum id → label", () => {
    expect(categoryLabel("rent")).toBe("Ijara");
    expect(categoryLabel("salary")).toBe("Ish haqi");
  });

  it("noma'lum id → Boshqa", () => {
    expect(categoryLabel("nimadir")).toBe("Boshqa");
  });
});

import { customerBalance, debtTotal, debtFromSale } from "../debt-math";

describe("customerBalance", () => {
  it("qarz − to'lov", () => {
    // 100k sotuv, 40k to'langan → 60k qarz; keyin 20k to'lov → 40k qoldi
    const sales = [{ total_revenue: 100000, paid_amount: 40000 }];
    const payments = [{ amount: 20000 }];
    expect(customerBalance(sales, payments)).toBe(40000);
  });

  it("to'liq to'langan = 0", () => {
    expect(customerBalance([{ total_revenue: 50000, paid_amount: 50000 }], [])).toBe(0);
  });

  it("ortiqcha to'lov = manfiy (oldindan to'lov)", () => {
    expect(customerBalance([{ total_revenue: 30000, paid_amount: 0 }], [{ amount: 50000 }])).toBe(
      -20000,
    );
  });
});

describe("debtTotal", () => {
  it("faqat musbat balanslar", () => {
    expect(debtTotal([{ balance: 60000 }, { balance: -10000 }, { balance: 5000 }])).toBe(65000);
  });
});

describe("debtFromSale", () => {
  it("jami − to'langan", () => {
    expect(debtFromSale(100000, 40000)).toBe(60000);
  });
  it("to'liq to'langan = 0 (manfiy emas)", () => {
    expect(debtFromSale(100000, 120000)).toBe(0);
  });
});

import {
  paymentSplit,
  refundRate,
  reportTotals,
  sharePercent,
  type CashierReportRow,
} from "../cashier-report-math";

/** Test qatori — faqat kerakli ustunlar beriladi, qolgani nol. */
function row(over: Partial<CashierReportRow> = {}): CashierReportRow {
  return {
    cashier_id: "u1",
    email: "a@b.uz",
    role: "cashier",
    sales_count: 0,
    revenue: 0,
    avg_check: 0,
    cash_total: 0,
    card_total: 0,
    qr_total: 0,
    debt_total: 0,
    returns_count: 0,
    refund_total: 0,
    profit: 0,
    ...over,
  };
}

describe("sharePercent", () => {
  it("oddiy ulush", () => {
    expect(sharePercent(25, 100)).toBe(25);
    expect(sharePercent(1, 3)).toBeCloseTo(33.333, 3);
  });

  it("jami 0 yoki manfiy bo'lsa 0 (NaN/Infinity emas)", () => {
    expect(sharePercent(10, 0)).toBe(0);
    expect(sharePercent(10, -5)).toBe(0);
    expect(sharePercent(0, 0)).toBe(0);
  });

  it("noto'g'ri son kelsa 0", () => {
    expect(sharePercent(NaN, 100)).toBe(0);
    expect(sharePercent(10, Infinity)).toBe(0);
  });
});

describe("paymentSplit", () => {
  it("summasi kamayish tartibida, foiz bilan", () => {
    const s = paymentSplit(row({ cash_total: 30, card_total: 60, qr_total: 10 }));
    expect(s.map((x) => x.kind)).toEqual(["card", "cash", "qr"]);
    expect(s[0].percent).toBeCloseTo(60);
    expect(s[1].percent).toBeCloseTo(30);
  });

  it("nol summali usullar tashlab yuboriladi", () => {
    const s = paymentSplit(row({ cash_total: 100 }));
    expect(s).toHaveLength(1);
    expect(s[0].kind).toBe("cash");
    expect(s[0].percent).toBe(100);
  });

  it("hammasi nol bo'lsa bo'sh ro'yxat", () => {
    expect(paymentSplit(row())).toEqual([]);
  });
});

describe("reportTotals", () => {
  it("o'rtacha chek — o'rtachalarning o'rtachasi EMAS", () => {
    // 10×1000 va 1×100000: noto'g'ri usul 50 500 berardi
    const t = reportTotals([
      row({ sales_count: 10, revenue: 10000, avg_check: 1000 }),
      row({ sales_count: 1, revenue: 100000, avg_check: 100000 }),
    ]);
    expect(t.salesCount).toBe(11);
    expect(t.revenue).toBe(110000);
    expect(t.avgCheck).toBeCloseTo(10000, 2);
  });

  it("sotuv bo'lmasa o'rtacha chek 0 (nolga bo'linmaydi)", () => {
    expect(reportTotals([]).avgCheck).toBe(0);
    expect(reportTotals([row()]).avgCheck).toBe(0);
  });

  it("pul tiyinda yig'iladi — float drift yo'q", () => {
    const t = reportTotals([
      row({ sales_count: 1, revenue: 0.1 }),
      row({ sales_count: 1, revenue: 0.2 }),
    ]);
    expect(t.revenue).toBe(0.3);
  });

  it("kassir rejimida foyda null bo'lib qoladi (0 emas)", () => {
    const t = reportTotals([
      row({ sales_count: 2, revenue: 500, profit: null, returns_count: null, refund_total: null }),
    ]);
    expect(t.profit).toBeNull();
    expect(t.returnsCount).toBe(0);
    expect(t.refundTotal).toBe(0);
  });

  it("egada foyda yig'iladi", () => {
    const t = reportTotals([
      row({ sales_count: 1, revenue: 1000, profit: 300 }),
      row({ sales_count: 1, revenue: 2000, profit: 700 }),
    ]);
    expect(t.profit).toBe(1000);
  });
});

describe("refundRate", () => {
  it("tushumga nisbatan qaytarish ulushi", () => {
    expect(refundRate(row({ revenue: 1000, refund_total: 150 }))).toBeCloseTo(15);
  });

  it("tushum yo'q yoki qaytarish null bo'lsa 0", () => {
    expect(refundRate(row({ revenue: 0, refund_total: 100 }))).toBe(0);
    expect(refundRate(row({ revenue: 1000, refund_total: null }))).toBe(0);
  });
});

import {
  trendTotals,
  compactSom,
  niceMax,
  dayLabel,
  periodSplit,
  pctChange,
} from "../dashboard-math";
import type { SalesTrendPoint } from "@/types/database";

function pt(day: string, revenue: number, profit: number, sales_count: number): SalesTrendPoint {
  return { day, revenue, profit, sales_count };
}

describe("trendTotals", () => {
  it("tushum/foyda/sotuv sonini yig'adi", () => {
    const pts = [pt("2026-06-01", 100, 30, 2), pt("2026-06-02", 250, 70, 3)];
    expect(trendTotals(pts)).toEqual({ revenue: 350, profit: 100, count: 5 });
  });

  it("bo'sh massiv = 0", () => {
    expect(trendTotals([])).toEqual({ revenue: 0, profit: 0, count: 0 });
  });
});

describe("compactSom", () => {
  it("million / ming / kichik", () => {
    expect(compactSom(1_200_000)).toBe("1.2M");
    expect(compactSom(15_000)).toBe("15k");
    expect(compactSom(950)).toBe("950");
    expect(compactSom(0)).toBe("0");
  });
});

describe("niceMax", () => {
  it("1/2/5 × 10^k ga yaxlitlaydi (yuqoriga)", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(8)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(45)).toBe(50);
    expect(niceMax(1_200_000)).toBe(2_000_000);
  });

  it("manfiy/0 da 1 (nolga bo'lish himoyasi)", () => {
    expect(niceMax(-5)).toBe(1);
  });
});

describe("dayLabel", () => {
  it("YYYY-MM-DD → DD.MM", () => {
    expect(dayLabel("2026-06-07")).toBe("07.06");
  });
});

describe("periodSplit", () => {
  it("2N kunni joriy/oldingi ga ajratadi", () => {
    const arr = [1, 2, 3, 4]; // 2 kunlik davr
    expect(periodSplit(arr, 2)).toEqual({ current: [3, 4], previous: [1, 2] });
  });

  it("Bugun (days=1): oxirgi=bugun, oldingi=kecha", () => {
    expect(periodSplit([10, 20], 1)).toEqual({ current: [20], previous: [10] });
  });

  it("oldingi davr yetishmasa bo'sh", () => {
    expect(periodSplit([5], 1)).toEqual({ current: [5], previous: [] });
  });
});

describe("pctChange", () => {
  it("o'sish/pasayish foizi", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });

  it("oldingi 0 → null (badge yo'q)", () => {
    expect(pctChange(50, 0)).toBeNull();
  });
});

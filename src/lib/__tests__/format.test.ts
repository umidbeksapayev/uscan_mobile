import {
  formatCurrency,
  formatWeight,
  formatNumber,
  formatDateTime,
  formatDateTimeFull,
} from "../format";

describe("formatCurrency (so'm, DECIMAL)", () => {
  it("minglik guruhni bo'sh joy bilan ajratadi + so'm qo'shadi", () => {
    expect(formatCurrency(2450000)).toBe("2 450 000 so'm");
    expect(formatCurrency(1000)).toBe("1 000 so'm");
    expect(formatCurrency(0)).toBe("0 so'm");
    expect(formatCurrency(999)).toBe("999 so'm");
  });

  it("kasrlarni yaxlitlaydi (0 kasr)", () => {
    expect(formatCurrency(12000.4)).toBe("12 000 so'm");
    expect(formatCurrency(12000.6)).toBe("12 001 so'm");
  });
});

describe("formatNumber (birliksiz guruh)", () => {
  it("minglik guruh, birlik yo'q", () => {
    expect(formatNumber(2450000)).toBe("2 450 000");
    expect(formatNumber(1000)).toBe("1 000");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(0)).toBe("0");
  });

  it("kasrni yaxlitlaydi", () => {
    expect(formatNumber(1500.6)).toBe("1 501");
    expect(formatNumber(1500.4)).toBe("1 500");
  });
});

describe("formatDateTime (Asia/Tashkent, UTC+5)", () => {
  it("UTC -> +5 ofset, kun.oy soat:daqiqa", () => {
    expect(formatDateTime("2026-06-07T09:18:33Z")).toBe("07.06 14:18");
  });

  it("kun chegarasidan o'tish (20:30Z + 5h = ertangi 01:30)", () => {
    expect(formatDateTime("2026-06-07T20:30:00Z")).toBe("08.06 01:30");
  });
});

describe("formatDateTimeFull (yil bilan)", () => {
  it("kun.oy.yil soat:daqiqa", () => {
    expect(formatDateTimeFull("2026-06-07T09:18:33Z")).toBe("07.06.2026 14:18");
  });

  it("yil chegarasidan o'tish (31.12 20:00Z + 5h = 01.01 keyingi yil)", () => {
    expect(formatDateTimeFull("2025-12-31T20:00:00Z")).toBe("01.01.2026 01:00");
  });
});

describe("formatWeight (kg, DECIMAL)", () => {
  it(">= 1 bo'lsa kg, 3 kasr", () => {
    expect(formatWeight(1.25)).toBe("1.250 kg");
    expect(formatWeight(2)).toBe("2.000 kg");
    expect(formatWeight(1)).toBe("1.000 kg");
  });

  it("< 1 bo'lsa gramm", () => {
    expect(formatWeight(0.85)).toBe("850 gramm");
    expect(formatWeight(0.5)).toBe("500 gramm");
    expect(formatWeight(0.123)).toBe("123 gramm");
  });
});

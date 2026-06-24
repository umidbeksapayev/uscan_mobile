import { formatCurrency, formatWeight } from "../format";

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

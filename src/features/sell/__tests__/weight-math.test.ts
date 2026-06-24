import { kgFromAmount, amountFromKg } from "../weight-math";

describe("kgFromAmount (so'm → kg)", () => {
  it("15 000 so'm / 10 000 = 1.5 kg", () => {
    expect(kgFromAmount(15000, 10000)).toBe(1.5);
  });

  it("3 kasrgacha yaxlitlaydi", () => {
    // 15000 / 13000 = 1.15384... → 1.154
    expect(kgFromAmount(15000, 13000)).toBe(1.154);
  });

  it("narx 0 bo'lsa 0", () => {
    expect(kgFromAmount(15000, 0)).toBe(0);
  });
});

describe("amountFromKg (kg → so'm)", () => {
  it("1.5 kg × 10 000 = 15 000 so'm", () => {
    expect(amountFromKg(1.5, 10000)).toBe(15000);
  });

  it("yaxlitlaydi", () => {
    expect(amountFromKg(1.154, 13000)).toBe(15002);
  });
});

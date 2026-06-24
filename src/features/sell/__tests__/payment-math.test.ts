import { changeAmount } from "../payment-math";

describe("changeAmount", () => {
  it("qaytim to'g'ri hisoblanadi", () => {
    expect(changeAmount(30000, 23250)).toBe(6750);
    expect(changeAmount(25000, 25000)).toBe(0);
  });

  it("pul yetishmasa manfiy", () => {
    expect(changeAmount(20000, 23250)).toBe(-3250);
  });
});

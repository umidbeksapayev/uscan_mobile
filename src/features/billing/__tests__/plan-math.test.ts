import { daysUntil, shouldShowPlanBanner } from "../plan-math";

const NOW = new Date("2026-08-14T00:00:00.000Z");

describe("daysUntil", () => {
  it("kelajakdagi sanagacha kunlarni to'g'ri hisoblaydi", () => {
    expect(daysUntil("2026-08-17T00:00:00.000Z", NOW)).toBe(3);
  });

  it("aynan bir kun qolganda 1 qaytaradi", () => {
    expect(daysUntil("2026-08-15T00:00:00.000Z", NOW)).toBe(1);
  });

  it("o'tib ketgan sana → 0", () => {
    expect(daysUntil("2026-08-01T00:00:00.000Z", NOW)).toBe(0);
  });

  it("null/undefined → 0", () => {
    expect(daysUntil(null, NOW)).toBe(0);
    expect(daysUntil(undefined, NOW)).toBe(0);
  });
});

describe("shouldShowPlanBanner", () => {
  it("muddati o'tgan bo'lsa har doim true", () => {
    expect(
      shouldShowPlanBanner({ status: "expired", expired: true, trialEndsAt: null, now: NOW }),
    ).toBe(true);
  });

  it("sinov 3 kun yoki kamroq qolganda true", () => {
    expect(
      shouldShowPlanBanner({
        status: "trialing",
        expired: false,
        trialEndsAt: "2026-08-16T00:00:00.000Z",
        now: NOW,
      }),
    ).toBe(true);
  });

  it("sinov 3 kundan ko'p qolganda false", () => {
    expect(
      shouldShowPlanBanner({
        status: "trialing",
        expired: false,
        trialEndsAt: "2026-08-25T00:00:00.000Z",
        now: NOW,
      }),
    ).toBe(false);
  });

  it("faol (active) obunada false", () => {
    expect(
      shouldShowPlanBanner({ status: "active", expired: false, trialEndsAt: null, now: NOW }),
    ).toBe(false);
  });
});

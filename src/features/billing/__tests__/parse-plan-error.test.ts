import { parsePlanLimitError } from "../parse-plan-error";

describe("parsePlanLimitError", () => {
  it("mahsulot limiti xatosini ajratadi", () => {
    expect(parsePlanLimitError("plan_limit_products:100")).toEqual({
      key: "products",
      limit: 100,
    });
  });

  it("Supabase o'rab yuboradigan xabar ichidan ham topadi", () => {
    const wrapped = 'new row for relation "products" violates: plan_limit_products:1000';
    expect(parsePlanLimitError(wrapped)).toEqual({ key: "products", limit: 1000 });
  });

  it("boshqa kalitlarni ham to'g'ri taniydi", () => {
    expect(parsePlanLimitError("plan_limit_members:3")).toEqual({ key: "members", limit: 3 });
    expect(parsePlanLimitError("plan_limit_ai_daily:30")).toEqual({ key: "ai_daily", limit: 30 });
  });

  it("plan_limit bo'lmagan xatoda null", () => {
    expect(parsePlanLimitError("Ruxsat yo'q")).toBeNull();
    expect(parsePlanLimitError("already_onboarded")).toBeNull();
  });

  it("noma'lum kalit bilan null", () => {
    expect(parsePlanLimitError("plan_limit_unknown_thing:5")).toBeNull();
  });

  it("null/undefined/bo'sh → null", () => {
    expect(parsePlanLimitError(null)).toBeNull();
    expect(parsePlanLimitError(undefined)).toBeNull();
    expect(parsePlanLimitError("")).toBeNull();
  });
});

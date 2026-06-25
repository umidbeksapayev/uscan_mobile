import { canDo } from "../permissions";

describe("canDo (RBAC ruxsat tekshiruvi)", () => {
  it("rol yo'q bo'lsa → false", () => {
    expect(canDo(undefined, undefined, "view_cost")).toBe(false);
    expect(canDo(undefined, { view_cost: true }, "view_cost")).toBe(false);
  });

  it("ega → ruxsatlardan qat'i nazar har doim true", () => {
    expect(canDo("owner", {}, "view_cost")).toBe(true);
    expect(canDo("owner", undefined, "manage_products")).toBe(true);
    expect(canDo("owner", { view_cost: false }, "view_cost")).toBe(true);
  });

  it("kassir → faqat aniq yoqilgan ruxsat", () => {
    expect(canDo("cashier", { view_cost: true }, "view_cost")).toBe(true);
    expect(canDo("cashier", { view_cost: false }, "view_cost")).toBe(false);
    expect(canDo("cashier", {}, "view_cost")).toBe(false);
    expect(canDo("cashier", undefined, "view_cost")).toBe(false);
  });

  it("kassir → boshqa ruxsat yoqilgani bu ruxsatni bermaydi", () => {
    expect(canDo("cashier", { manage_debt: true }, "view_cost")).toBe(false);
    expect(canDo("cashier", { manage_debt: true }, "manage_debt")).toBe(true);
  });
});

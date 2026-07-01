import { pickActiveMembership } from "../pick-active-membership";
import type { Membership } from "@/types/database";

function membership(shopId: string, role: "owner" | "cashier" = "owner"): Membership {
  return { shop: { id: shopId, name: `Do'kon ${shopId}` }, role, permissions: {} };
}

describe("pickActiveMembership", () => {
  it("ro'yxat bo'sh bo'lsa → undefined", () => {
    expect(pickActiveMembership([], null)).toBeUndefined();
    expect(pickActiveMembership([], "a")).toBeUndefined();
  });

  it("tanlanmagan bo'lsa (null) → birinchi (eng yangi) a'zolik", () => {
    const list = [membership("a"), membership("b")];
    expect(pickActiveMembership(list, null)).toBe(list[0]);
  });

  it("tanlangan do'kon ro'yxatda bo'lsa → o'sha qaytadi", () => {
    const list = [membership("a"), membership("b")];
    expect(pickActiveMembership(list, "b")).toBe(list[1]);
  });

  it("tanlangan do'kon ro'yxatda YO'Q bo'lsa (masalan xodimlikdan chiqarilgan) → birinchiga tushadi", () => {
    const list = [membership("a"), membership("b")];
    expect(pickActiveMembership(list, "c-removed")).toBe(list[0]);
  });
});

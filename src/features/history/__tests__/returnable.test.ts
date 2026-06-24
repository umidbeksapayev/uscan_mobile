import { returnableQty, refundPreview } from "../returnable";
import type { SaleItem } from "@/types/database";

function saleItem(
  id: string,
  price: number,
  sale_type: "unit" | "weight" = "unit"
): SaleItem {
  return { id, sale_type, selling_price_snapshot: price } as SaleItem;
}

describe("returnableQty", () => {
  it("sotilgan − qaytarilgan", () => {
    expect(returnableQty(5, 0)).toBe(5);
    expect(returnableQty(5, 2)).toBe(3);
  });

  it("hammasi qaytarilgan = 0", () => {
    expect(returnableQty(5, 5)).toBe(0);
  });

  it("manfiyga tushmaydi", () => {
    expect(returnableQty(5, 8)).toBe(0);
  });
});

describe("refundPreview", () => {
  const items = [saleItem("a", 12000), saleItem("b", 4000), saleItem("c", 18000, "weight")];

  it("tanlangan qatorlar summasi", () => {
    expect(refundPreview(items, { a: "2" })).toBe(24000);
    expect(refundPreview(items, { a: "2", b: "1" })).toBe(28000);
  });

  it("0 yoki bo'sh qatorni hisobga olmaydi", () => {
    expect(refundPreview(items, { a: "0", b: "" })).toBe(0);
    expect(refundPreview(items, {})).toBe(0);
  });

  it("VAZN: kasrli kg ni tiyinda yaxlitlaydi (float drift yo'q)", () => {
    // 18000 × 1.333 = 23994
    expect(refundPreview(items, { c: "1.333" })).toBe(23994);
  });
});

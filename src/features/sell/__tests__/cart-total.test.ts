import { cartTotal } from "../cart-total";
import type { CartItem } from "../cart-store";

function item(price: number, qty: number, sale_type: "unit" | "weight" = "unit"): CartItem {
  return { product: { selling_price: price, sale_type } as never, quantity: qty };
}

describe("cartTotal", () => {
  it("DONALI: narx × dona", () => {
    expect(cartTotal([item(12000, 2)])).toBe(24000);
    expect(cartTotal([item(12000, 2), item(4000, 1)])).toBe(28000);
  });

  it("VAZN: narx × kg", () => {
    expect(cartTotal([item(18000, 1.25, "weight")])).toBe(22500);
  });

  it("kasrli vaznni tiyinda yaxlitlaydi (float drift yo'q)", () => {
    // 18000 × 1.333 = 23994
    expect(cartTotal([item(18000, 1.333, "weight")])).toBe(23994);
  });

  it("bo'sh savat = 0", () => {
    expect(cartTotal([])).toBe(0);
  });
});

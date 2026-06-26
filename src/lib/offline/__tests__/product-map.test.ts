import { productToRow, rowToProduct, categoryName, type ProductRow } from "../product-map";

const NOW = "2026-06-26T00:00:00.000Z";

describe("productToRow", () => {
  it("cost_price'ni keshga YOZMAYDI (maxfiy)", () => {
    const row = productToRow(
      { id: "1", shop_id: "s", name: "Cola", sale_type: "unit", selling_price: 5000, quantity: 10, cost_price: 4000 },
      NOW,
    );
    expect("cost_price" in row).toBe(false);
    expect((row as unknown as Record<string, unknown>).cost_price).toBeUndefined();
  });

  it("maydonlarni map qiladi + created_at→server_updated_at", () => {
    const row = productToRow(
      {
        id: "1", shop_id: "s", name: "Olma", sale_type: "weight", selling_price: 12000,
        quantity: 2.5, barcode: "123", category_id: "c1", is_active: true, image_url: "u",
        created_at: "2026-01-01T00:00:00Z",
      },
      NOW,
    );
    expect(row).toMatchObject({
      id: "1", sale_type: "weight", selling_price: 12000, quantity: 2.5, barcode: "123",
      category_id: "c1", is_active: 1, server_updated_at: "2026-01-01T00:00:00Z", local_updated_at: NOW,
    });
  });

  it("is_active=false → 0", () => {
    const row = productToRow({ id: "1", shop_id: "s", name: "x", sale_type: "unit", selling_price: 1, quantity: 1, is_active: false }, NOW);
    expect(row.is_active).toBe(0);
  });
});

describe("categoryName", () => {
  it("obyekt, massiv va null formatlarini boshqaradi", () => {
    expect(categoryName({ category: { name: "Ichimlik" } })).toBe("Ichimlik");
    expect(categoryName({ category: [{ name: "Ovqat" }] })).toBe("Ovqat");
    expect(categoryName({ category: null })).toBeNull();
    expect(categoryName({})).toBeNull();
  });
});

describe("rowToProduct", () => {
  const row: ProductRow = {
    id: "1", shop_id: "s", name: "Cola", sale_type: "unit", selling_price: 5000, quantity: 10,
    barcode: "123", category_id: "c1", is_active: 1, image_url: "u", category_name: "Ichimlik",
    server_updated_at: "2026-01-01T00:00:00Z", local_updated_at: NOW,
  };

  it("cost_price=0 (maxfiy), is_active boolean, kategoriya map", () => {
    const p = rowToProduct(row);
    expect(p.cost_price).toBe(0);
    expect(p.is_active).toBe(true);
    expect(p.category).toEqual({ name: "Ichimlik" });
    expect(p.selling_price).toBe(5000);
  });

  it("category_name null → category null", () => {
    expect(rowToProduct({ ...row, category_name: null }).category).toBeNull();
  });
});

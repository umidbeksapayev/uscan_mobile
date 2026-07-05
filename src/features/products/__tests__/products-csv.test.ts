import { buildProductsCsv, type ProductCsvRow } from "../products-csv";
import { parseCsv, buildPreview } from "../import-products";

const ROWS: ProductCsvRow[] = [
  {
    name: "Guruch",
    sale_type: "weight",
    cost_price: 10000,
    selling_price: 13500,
    quantity: 25.5,
    barcode: null,
    category: "Oziq-ovqat",
  },
  {
    name: 'Shampun "Soft", 400ml',
    sale_type: "unit",
    cost_price: 18000,
    selling_price: 25000,
    quantity: 12,
    barcode: "4780000000017",
    category: null,
  },
];

describe("buildProductsCsv", () => {
  it("tan narx ustuni faqat includeCost'da", () => {
    const withCost = buildProductsCsv(ROWS, true);
    const noCost = buildProductsCsv(ROWS, false);
    expect(withCost.split("\r\n")[0]).toBe("Nomi,Tur,Tan narxi,Sotish narxi,Miqdor,Barcode,Kategoriya");
    expect(noCost.split("\r\n")[0]).toBe("Nomi,Tur,Sotish narxi,Miqdor,Barcode,Kategoriya");
    expect(noCost).not.toContain("10000");
    expect(noCost).not.toContain("18000");
  });

  it("tur dona/kg deb yoziladi", () => {
    const csv = buildProductsCsv(ROWS, true);
    expect(csv).toContain("Guruch,kg,");
    expect(csv).toContain(",dona,");
  });

  it("vergul/qo'shtirnoqli nom escape qilinadi", () => {
    const line = buildProductsCsv(ROWS, false).split("\r\n")[2];
    expect(line.startsWith('"Shampun ""Soft"", 400ml"')).toBe(true);
  });

  it("round-trip: eksport → import parseri hammasini valid deb o'qiydi", () => {
    const csv = buildProductsCsv(ROWS, true);
    const preview = buildPreview(parseCsv(csv));
    expect(preview.headerError).toBe(false);
    expect(preview.validCount).toBe(2);
    expect(preview.rows[0]).toMatchObject({
      name: "Guruch",
      saleType: "weight",
      costPrice: 10000,
      sellingPrice: 13500,
      quantity: 25.5,
      category: "Oziq-ovqat",
    });
    expect(preview.rows[1]).toMatchObject({
      name: 'Shampun "Soft", 400ml',
      saleType: "unit",
      barcode: "4780000000017",
    });
  });
});

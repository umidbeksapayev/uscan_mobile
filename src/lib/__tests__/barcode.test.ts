import { normalizeBarcode, barcodeVariants } from "../barcode";

describe("normalizeBarcode", () => {
  it("belgilar va probelni olib tashlaydi", () => {
    expect(normalizeBarcode("  123 456 ")).toBe("123456");
    expect(normalizeBarcode("12-34_56")).toBe("123456");
  });
});

describe("barcodeVariants", () => {
  it("UPC-A (12) uchun EAN-13 (yetakchi nol) qo'shadi", () => {
    expect(barcodeVariants("123456789012")).toEqual(["123456789012", "0123456789012"]);
  });

  it("yetakchi nolli EAN-13 (13) uchun UPC-A (12) qo'shadi", () => {
    expect(barcodeVariants("0123456789012")).toEqual(["0123456789012", "123456789012"]);
  });

  it("oddiy EAN-13 (yetakchi nolsiz) o'zgarmaydi", () => {
    expect(barcodeVariants("4780000000016")).toEqual(["4780000000016"]);
  });

  it("raqamli bo'lmagan kod o'zgarmaydi", () => {
    expect(barcodeVariants("ABC-128")).toEqual(["ABC128"]);
  });
});

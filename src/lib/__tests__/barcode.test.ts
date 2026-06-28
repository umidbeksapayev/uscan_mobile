import {
  normalizeBarcode,
  barcodeVariants,
  generateInternalBarcode,
  isValidEan13,
} from "../barcode";

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

describe("generateInternalBarcode", () => {
  it("8 xonali, '2' bilan boshlanadi, 20000000–29999999 oralig'ida", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInternalBarcode();
      expect(code).toMatch(/^2\d{7}$/);
      const n = Number(code);
      expect(n).toBeGreaterThanOrEqual(20000000);
      expect(n).toBeLessThanOrEqual(29999999);
    }
  });

  it("turli chaqiruvlar har xil (yuqori ehtimol)", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateInternalBarcode()));
    expect(set.size).toBeGreaterThan(90);
  });
});

describe("isValidEan13", () => {
  it("haqiqiy EAN-13 (nazorat raqami to'g'ri)", () => {
    expect(isValidEan13("4006381333931")).toBe(true);
  });
  it("noto'g'ri nazorat raqami → false", () => {
    expect(isValidEan13("4006381333930")).toBe(false);
  });
  it("13 raqam bo'lmasa → false", () => {
    expect(isValidEan13("400638133393")).toBe(false);
    expect(isValidEan13("abcdefghijklm")).toBe(false);
  });
});

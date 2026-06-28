import { sanitize, padLine, encodeReceipt, encodeLabel } from "../escpos-encoder";
import type { ReceiptData } from "../types";
import type { LabelData } from "@/features/labels/barcode-format";

/** baytlar ketma-ketligida sub-array borligini tekshiradi. */
function includesSeq(arr: number[], seq: number[]): boolean {
  for (let i = 0; i + seq.length <= arr.length; i += 1) {
    if (seq.every((v, j) => arr[i + j] === v)) return true;
  }
  return false;
}

describe("sanitize", () => {
  it("o'zbek apostrof variantlarini ' ga moslaydi", () => {
    expect(sanitize("soʻm")).toBe("so'm");
    expect(sanitize("oʼzbek")).toBe("o'zbek");
  });
  it("maxsus belgilarni tozalaydi (… → ..., — → -)", () => {
    expect(sanitize("a…b")).toBe("a...b");
    expect(sanitize("a—b")).toBe("a-b");
  });
  it("ASCII bo'lmaganni ? ga, printable ASCII'ni saqlaydi", () => {
    expect(sanitize("Café")).toBe("Caf?");
    expect(sanitize("Non 2 dona")).toBe("Non 2 dona");
  });
});

describe("padLine", () => {
  it("natija aniq width belgili", () => {
    expect(padLine("Non", "6 000", 32)).toHaveLength(32);
  });
  it("o'ng (summa) o'ngda, chap chapda", () => {
    const l = padLine("Non", "6 000", 20);
    expect(l.startsWith("Non")).toBe(true);
    expect(l.endsWith("6 000")).toBe(true);
  });
  it("uzun chap matnni kesadi (summa joyi saqlanadi)", () => {
    const l = padLine("Juda juda uzun mahsulot nomi", "24 000", 24);
    expect(l).toHaveLength(24);
    expect(l.endsWith("24 000")).toBe(true);
  });
});

const data: ReceiptData = {
  shopName: "Dilshod Market",
  saleId: "offline-abcdef12-3456",
  soldAt: "2026-06-26T09:18:00.000Z",
  items: [
    { name: "Non", saleType: "unit", quantity: 2, unitPrice: 3000, lineTotal: 6000 },
    { name: "Shakar", saleType: "weight", quantity: 1.25, unitPrice: 19200, lineTotal: 24000 },
  ],
  totalRevenue: 30000,
  paymentMethod: "Naqd",
  givenAmount: 50000,
  changeAmount: 20000,
};

describe("encodeReceipt", () => {
  it("number[] qaytaradi, har bayt 0–255", () => {
    const b = encodeReceipt(data);
    expect(Array.isArray(b)).toBe(true);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)).toBe(true);
  });
  it("INIT (ESC @) bilan boshlanadi", () => {
    const b = encodeReceipt(data);
    expect(b[0]).toBe(0x1b);
    expect(b[1]).toBe(0x40);
  });
  it("oxirida CUT (GS V 0)", () => {
    const b = encodeReceipt(data);
    expect(b.slice(-3)).toEqual([0x1d, 0x56, 0x00]);
  });
  it("do'kon nomi baytlari mavjud", () => {
    const b = encodeReceipt(data);
    const ascii = b.filter((n) => n >= 32 && n <= 126).map((n) => String.fromCharCode(n)).join("");
    expect(ascii).toContain("Dilshod Market");
    expect(ascii).toContain("JAMI");
    expect(ascii).toContain("Shakar 1.250kg");
  });
});

const labels: LabelData[] = [
  { name: "Coca Cola 0.5L", price: 8000, barcode: "20000001", shopName: "Dilshod Market" },
  { name: "Barcode'siz mahsulot", price: 5000, barcode: null },
];

describe("encodeLabel", () => {
  it("INIT bilan boshlanadi, har bayt 0–255", () => {
    const b = encodeLabel(labels);
    expect(b[0]).toBe(0x1b);
    expect(b[1]).toBe(0x40);
    expect(b.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)).toBe(true);
  });

  it("barcode bo'lsa GS k (CODE128) chiqadi + nom baytlari", () => {
    const b = encodeLabel(labels);
    expect(includesSeq(b, [0x1d, 0x6b, 73])).toBe(true); // GS k 73
    const ascii = b.filter((n) => n >= 32 && n <= 126).map((n) => String.fromCharCode(n)).join("");
    expect(ascii).toContain("Coca Cola 0.5L");
  });

  it("juft-raqamli barcode Code C ('{C') bilan kodlanadi", () => {
    const b = encodeLabel([{ name: "X", price: 1000, barcode: "20000001" }]);
    expect(includesSeq(b, [0x7b, 0x43])).toBe(true); // "{C"
    // juft raqamlar bayt sifatida: 20,00,00,01
    expect(includesSeq(b, [20, 0, 0, 1])).toBe(true);
  });

  it("raqamli bo'lmagan barcode Code B ('{B')", () => {
    const b = encodeLabel([{ name: "X", price: 1000, barcode: "ABC123" }]);
    expect(includesSeq(b, [0x7b, 0x42])).toBe(true); // "{B"
  });

  it("barcode'siz yorliqda GS k chiqmaydi (faqat shu yorliq uchun)", () => {
    const b = encodeLabel([{ name: "X", price: 1000, barcode: null }]);
    expect(includesSeq(b, [0x1d, 0x6b, 73])).toBe(false);
  });

  it("har yorliq oxirida CUT", () => {
    const b = encodeLabel(labels);
    expect(b.slice(-3)).toEqual([0x1d, 0x56, 0x00]);
  });
});

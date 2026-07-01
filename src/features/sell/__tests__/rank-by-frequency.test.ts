import { rankByFrequency } from "../rank-by-frequency";

describe("rankByFrequency", () => {
  it("eng ko'p uchragan mahsulot birinchi bo'ladi", () => {
    const rows = [
      { product_id: "a" },
      { product_id: "b" },
      { product_id: "a" },
      { product_id: "c" },
      { product_id: "a" },
      { product_id: "b" },
    ];
    expect(rankByFrequency(rows, 10)).toEqual(["a", "b", "c"]);
  });

  it("limit'dan oshmaydi", () => {
    const rows = [{ product_id: "a" }, { product_id: "b" }, { product_id: "c" }];
    expect(rankByFrequency(rows, 2)).toEqual(["a", "b"]);
  });

  it("bo'sh ro'yxat → bo'sh natija", () => {
    expect(rankByFrequency([], 8)).toEqual([]);
  });

  it("bitta katta xarid (bir marta) ko'p kichik takroriy xariddan (bir necha marta) oshib ketmaydi", () => {
    // "a" faqat 1 marta sotilgan (lekin katta miqdorda bo'lishi mumkin — bu yerda
    // faqat qator soni hisoblanadi, miqdor emas), "b" 3 marta alohida sotilgan.
    const rows = [{ product_id: "a" }, { product_id: "b" }, { product_id: "b" }, { product_id: "b" }];
    expect(rankByFrequency(rows, 10)).toEqual(["b", "a"]);
  });
});

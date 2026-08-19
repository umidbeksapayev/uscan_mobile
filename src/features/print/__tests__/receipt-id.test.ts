import { shortReceiptId } from "../receipt-id";

describe("shortReceiptId", () => {
  it("offline- prefiksini olib tashlaydi", () => {
    expect(shortReceiptId("offline-sale123")).toBe(shortReceiptId("sale123"));
  });

  it("qr- prefiksini ham olib tashlaydi", () => {
    /*
      B1 da topilgan xato: HTML chek (`receipt-template.ts`) va ESC-POS chek
      (`escpos-encoder.ts`) ikkita ALOHIDA `shortId` nusxasiga ega edi va
      ular BIR-BIRIDAN FARQ QILARDI — HTML varianti `qr-` ni olib
      tashlamasdi. Natijada bitta QR sotuvi termal chekda va PDF'da
      IKKI XIL raqam bilan chiqardi. Endi ikkalasi HAM shu funksiyani
      ishlatadi — bu test ikkalasining bir xilligini kafolatlaydi.
    */
    expect(shortReceiptId("qr-sale123")).toBe(shortReceiptId("sale123"));
  });

  it("8 belgidan qisqa id'ni to'liq, katta harfda qaytaradi", () => {
    expect(shortReceiptId("abc123")).toBe("ABC123");
  });

  it("8 belgidan uzun id'ning oxirgi 6 belgisini oladi", () => {
    expect(shortReceiptId("abcdef123456")).toBe("123456");
  });

  it("prefikslarsiz oddiy UUID bilan ham ishlaydi", () => {
    const id = "a1b2c3d4-e5f6-7890";
    expect(shortReceiptId(id)).toBe(id.slice(-6).toUpperCase());
  });
});

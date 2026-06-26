import { buildReceiptHtml } from "../receipt-template";
import type { ReceiptData, ReceiptLine } from "../types";

const unitLine: ReceiptLine = { name: "Non", saleType: "unit", quantity: 2, unitPrice: 3000, lineTotal: 6000 };
const weightLine: ReceiptLine = { name: "Shakar", saleType: "weight", quantity: 1.25, unitPrice: 19200, lineTotal: 24000 };

function base(over: Partial<ReceiptData> = {}): ReceiptData {
  return {
    shopName: "Dilshod Market",
    saleId: "offline-abcdef12-3456",
    soldAt: "2026-06-26T09:18:00.000Z",
    items: [unitLine, weightLine],
    totalRevenue: 30000,
    paymentMethod: "Naqd",
    givenAmount: 50000,
    changeAmount: 20000,
    ...over,
  };
}

describe("buildReceiptHtml", () => {
  it("HTML string qaytaradi", () => {
    const html = buildReceiptHtml(base());
    expect(typeof html).toBe("string");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("do'kon nomi va sana mavjud", () => {
    const html = buildReceiptHtml(base({ shopPhone: "+998 90 123 45 67" }));
    expect(html).toContain("Dilshod Market");
    expect(html).toContain("26.06.2026");
    expect(html).toContain("+998 90 123 45 67");
  });

  it("DONALI qator: nom + ×miqdor + summa", () => {
    const html = buildReceiptHtml(base());
    expect(html).toContain("Non");
    expect(html).toContain("×2");
    expect(html).toContain("6 000");
  });

  it("VAZN qator: 1.250 kg + summa", () => {
    const html = buildReceiptHtml(base());
    expect(html).toContain("1.250 kg");
    expect(html).toContain("24 000");
  });

  it("jami qator bold (class=total) + 'so'm'", () => {
    const html = buildReceiptHtml(base());
    expect(html).toContain('class="total"');
    expect(html).toContain("JAMI");
    expect(html).toContain("30 000 so'm");
  });

  it("naqd: berilgan va qaytim ko'rsatiladi", () => {
    const html = buildReceiptHtml(base());
    expect(html).toContain("Berilgan");
    expect(html).toContain("50 000");
    expect(html).toContain("Qaytim");
    expect(html).toContain("20 000");
  });

  it("naqd bo'lmaganda berilgan/qaytim KO'RSATILMAYDI", () => {
    const html = buildReceiptHtml(base({ paymentMethod: "Karta", givenAmount: undefined, changeAmount: undefined }));
    expect(html).not.toContain("Berilgan");
    expect(html).not.toContain("Qaytim");
    expect(html).toContain("Karta");
  });

  it("nasiya: qarz summa va mijoz nomi ko'rsatiladi", () => {
    const html = buildReceiptHtml(base({ paymentMethod: "Nasiya", debtAmount: 15000, customerName: "Akmal aka", givenAmount: undefined }));
    expect(html).toContain("Nasiyaga");
    expect(html).toContain("15 000");
    expect(html).toContain("Akmal aka");
  });

  it("uzun nom 20 belgiga kesiladi (…)", () => {
    const longName = "Juda uzun mahsulot nomi qatori test";
    const html = buildReceiptHtml(base({ items: [{ ...unitLine, name: longName }] }));
    expect(html).not.toContain(longName);
    expect(html).toContain("…");
  });

  it("bo'sh savatda ham xato bermaydi", () => {
    expect(() => buildReceiptHtml(base({ items: [] }))).not.toThrow();
  });

  it("cost_price hech qayerda ko'rinmaydi (faqat selling/lineTotal)", () => {
    const html = buildReceiptHtml(base({ items: [{ ...unitLine, unitPrice: 3000, lineTotal: 6000 }] }));
    // 4000 (tipik tan narx) — kiritilmaydi, chunki tip cost_price'ni qabul qilmaydi
    expect(html).not.toContain("4 000");
  });
});

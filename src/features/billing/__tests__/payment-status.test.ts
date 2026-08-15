import {
  canCancel,
  canRetry,
  canSubmitReceipt,
  checkoutStep,
  isActivePayment,
  maskCardNumber,
  monthsForPeriod,
  plainCardNumber,
  statusTone,
  type PaymentStatus,
} from "../payment-status";

const ALL: PaymentStatus[] = ["pending", "reviewing", "approved", "rejected", "expired"];

describe("isActivePayment", () => {
  it("faqat pending va reviewing faol", () => {
    expect(ALL.filter(isActivePayment)).toEqual(["pending", "reviewing"]);
  });
});

describe("canSubmitReceipt", () => {
  it("chek yuborish pending va reviewing'da mumkin (noto'g'ri chekni almashtirish)", () => {
    expect(ALL.filter(canSubmitReceipt)).toEqual(["pending", "reviewing"]);
  });

  it("tasdiqlangan to'lovga chek yuborib bo'lmaydi (duplicate himoyasi)", () => {
    expect(canSubmitReceipt("approved")).toBe(false);
  });
});

describe("canCancel", () => {
  it("tasdiqlangan to'lovni bekor qilib bo'lmaydi", () => {
    expect(canCancel("approved")).toBe(false);
    expect(canCancel("pending")).toBe(true);
  });
});

describe("canRetry", () => {
  it("rad etilgan va muddati o'tganda qayta urinish mumkin", () => {
    expect(ALL.filter(canRetry)).toEqual(["rejected", "expired"]);
  });
});

describe("checkoutStep", () => {
  it("holatga qarab 1-2-3 qadam", () => {
    expect(checkoutStep("pending")).toBe(1);
    expect(checkoutStep("rejected")).toBe(1);
    expect(checkoutStep("expired")).toBe(1);
    expect(checkoutStep("reviewing")).toBe(2);
    expect(checkoutStep("approved")).toBe(3);
  });
});

describe("statusTone", () => {
  it("har bir holat uchun ohang bor", () => {
    ALL.forEach((s) => expect(typeof statusTone(s)).toBe("string"));
  });

  it("tasdiqlangan yashil, rad etilgan qizil", () => {
    expect(statusTone("approved")).toBe("success");
    expect(statusTone("rejected")).toBe("danger");
  });
});

describe("monthsForPeriod", () => {
  it("yillik = 12 oy", () => {
    expect(monthsForPeriod("year")).toBe(12);
    expect(monthsForPeriod("month")).toBe(1);
  });
});

describe("maskCardNumber", () => {
  it("16 xonali kartada faqat birinchi va oxirgi 4 raqam ko'rinadi", () => {
    expect(maskCardNumber("9860123412348200")).toBe("9860 **** **** 8200");
  });

  it("bo'sh joyli kirishni ham to'g'ri maskalaydi", () => {
    expect(maskCardNumber("9860 1234 1234 8200")).toBe("9860 **** **** 8200");
  });

  it("juda qisqa kirishga tegmaydi (kutilmagan formatni buzmaymiz)", () => {
    expect(maskCardNumber("1234")).toBe("1234");
  });

  it("hech qanday holatda o'rtadagi raqamlar chiqmaydi", () => {
    const masked = maskCardNumber("9860123412348200");
    expect(masked).not.toContain("1234");
  });
});

describe("plainCardNumber", () => {
  it("faqat raqamlar qoladi (nusxalash uchun)", () => {
    expect(plainCardNumber("9860 1234 1234 8200")).toBe("9860123412348200");
  });
});

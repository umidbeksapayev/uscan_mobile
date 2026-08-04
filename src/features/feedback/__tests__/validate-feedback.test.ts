import {
  FEEDBACK_MAX_LENGTH,
  isFeedbackCategory,
  remainingChars,
  validateFeedback,
} from "../validate-feedback";

describe("isFeedbackCategory", () => {
  it("DB CHECK dagi uchta qiymatni qabul qiladi", () => {
    expect(isFeedbackCategory("suggestion")).toBe(true);
    expect(isFeedbackCategory("complaint")).toBe(true);
    expect(isFeedbackCategory("bug")).toBe(true);
  });

  it("boshqa qiymatni rad etadi", () => {
    expect(isFeedbackCategory("praise")).toBe(false);
    expect(isFeedbackCategory("")).toBe(false);
  });
});

describe("validateFeedback", () => {
  it("to'g'ri kiritmada xato yo'q", () => {
    expect(validateFeedback({ category: "bug", message: "Skaner ishlamayapti" })).toBeNull();
  });

  it("bo'sh matnni rad etadi", () => {
    expect(validateFeedback({ category: "bug", message: "" })).toBe("empty");
  });

  it("faqat bo'sh joydan iborat matnni bo'sh deb hisoblaydi", () => {
    expect(validateFeedback({ category: "bug", message: "   \n\t " })).toBe("empty");
  });

  it("noma'lum kategoriyani rad etadi (DB CHECK'ga bormasdan)", () => {
    expect(validateFeedback({ category: "praise", message: "Zo'r" })).toBe("badCategory");
  });

  it("kategoriya matndan oldin tekshiriladi", () => {
    expect(validateFeedback({ category: "praise", message: "" })).toBe("badCategory");
  });

  it("chegaradagi uzunlikni qabul qiladi", () => {
    const exact = "a".repeat(FEEDBACK_MAX_LENGTH);
    expect(validateFeedback({ category: "suggestion", message: exact })).toBeNull();
  });

  it("chegaradan oshgan matnni rad etadi", () => {
    const tooLong = "a".repeat(FEEDBACK_MAX_LENGTH + 1);
    expect(validateFeedback({ category: "suggestion", message: tooLong })).toBe("tooLong");
  });

  it("uzunlik trim'dan keyin o'lchanadi — chetdagi bo'sh joy hisoblanmaydi", () => {
    const padded = `  ${"a".repeat(FEEDBACK_MAX_LENGTH)}  `;
    expect(validateFeedback({ category: "suggestion", message: padded })).toBeNull();
  });
});

describe("remainingChars", () => {
  it("bo'sh matnda to'liq chegara qoladi", () => {
    expect(remainingChars("")).toBe(FEEDBACK_MAX_LENGTH);
  });

  it("yozilgan belgilar ayiriladi", () => {
    expect(remainingChars("salom")).toBe(FEEDBACK_MAX_LENGTH - 5);
  });

  it("chegaradan oshsa manfiy bo'ladi", () => {
    expect(remainingChars("a".repeat(FEEDBACK_MAX_LENGTH + 3))).toBe(-3);
  });
});

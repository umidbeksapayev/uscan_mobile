import { classifySaleError, isRecoverableNetwork } from "../sync-math";

describe("classifySaleError (019 ga moslangan)", () => {
  it("tarmoq / ulanish / token xatolari → network", () => {
    expect(classifySaleError(new Error("Network request failed"))).toBe("network");
    expect(classifySaleError(new Error("Failed to fetch"))).toBe("network");
    expect(classifySaleError(new Error("Request timeout"))).toBe("network");
    expect(classifySaleError(new Error("JWT expired"))).toBe("network");
    expect(classifySaleError({ message: "fetch failed" })).toBe("network");
  });

  it("inventar konflikt (019 xabarlari) → conflict", () => {
    expect(classifySaleError(new Error('Yetarli miqdor yo\'q: "Cola" (mavjud: 2 dona)'))).toBe("conflict");
    expect(classifySaleError(new Error("Mahsulot topilmadi: abc-123"))).toBe("conflict");
    expect(classifySaleError({ message: "insufficient stock" })).toBe("conflict");
  });

  it("dublikat xatosi → already_done (kam ehtimol)", () => {
    expect(classifySaleError(new Error("duplicate key value"))).toBe("already_done");
  });

  it("validatsiya/ruxsat xatolari → unknown", () => {
    expect(classifySaleError(new Error("Savat bo'sh"))).toBe("unknown");
    expect(classifySaleError(new Error("Ruxsat yo'q"))).toBe("unknown");
    expect(classifySaleError(new Error("Mijoz topilmadi"))).toBe("unknown");
  });

  it("isRecoverableNetwork faqat network'da true", () => {
    expect(isRecoverableNetwork(new Error("network error"))).toBe(true);
    expect(isRecoverableNetwork(new Error("Yetarli miqdor yo'q"))).toBe(false);
    expect(isRecoverableNetwork(new Error("Savat bo'sh"))).toBe(false);
  });
});

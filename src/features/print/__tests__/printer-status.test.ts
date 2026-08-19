import { statusView, showsConnectionStatus } from "../printer-status";

describe("statusView", () => {
  it("ulangan va chiqarilmoqda — IKKALASI ham yashil", () => {
    // Kassir uchun "chiqarilmoqda" muammo emas, ish ketayotgani. Sariq/qizil
    // faqat e'tibor talab qiladigan holatlar uchun qoldirilgan.
    expect(statusView("connected").tone).toBe("success");
    expect(statusView("printing").tone).toBe("success");
  });

  it("ulanish jarayoni — sariq (kutish kerak)", () => {
    expect(statusView("connecting").tone).toBe("warning");
  });

  it("xato — qizil", () => {
    expect(statusView("error").tone).toBe("danger");
  });

  it("ulanmagan — neytral (xato EMAS: printer shunchaki hali kerak bo'lmagan)", () => {
    expect(statusView("disconnected").tone).toBe("muted");
  });

  it("har holat uchun i18n kaliti bor", () => {
    for (const s of ["disconnected", "connecting", "connected", "printing", "error"] as const) {
      expect(statusView(s).labelKey).toMatch(/^printer\.status/);
    }
  });
});

describe("showsConnectionStatus", () => {
  it("tizim printerida ko'rsatkich YO'Q — u dialog ochadi, ulanish tutmaydi", () => {
    // Ko'rsatilsa foydalanuvchi doimiy "ulanmagan" ni nosozlik deb o'ylardi.
    expect(showsConnectionStatus("system")).toBe(false);
  });

  it("bluetooth va tarmoq printerida ko'rsatiladi", () => {
    expect(showsConnectionStatus("bluetooth")).toBe(true);
    expect(showsConnectionStatus("network")).toBe(true);
  });
});

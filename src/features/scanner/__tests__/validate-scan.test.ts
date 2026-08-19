import { validateScan } from "../validate-scan";

describe("validateScan", () => {
  it("haqiqiy shtrix-kod formatlarini qabul qiladi", () => {
    expect(validateScan("4780010012345")).toBe("4780010012345"); // EAN-13
    expect(validateScan("20000001")).toBe("20000001"); // ichki 8 xonali
    expect(validateScan("012345678905")).toBe("012345678905"); // UPC-A
    expect(validateScan("ABC123")).toBe("ABC123"); // CODE128
  });

  it("skaner qo'shgan probel/ajratgichlarni tozalaydi", () => {
    expect(validateScan(" 4780 0100 12345 ")).toBe("4780010012345");
    expect(validateScan("478-001-001-2345")).toBe("4780010012345");
  });

  it("bo'sh va juda qisqa kodni rad etadi", () => {
    expect(validateScan("")).toBeNull();
    expect(validateScan("   ")).toBeNull();
    expect(validateScan("7")).toBeNull();
    expect(validateScan("-.-")).toBeNull(); // tozalangandan keyin bo'sh
  });

  it("juda uzun axlatni rad etadi (HID skaner adashganda)", () => {
    expect(validateScan("9".repeat(65))).toBeNull();
    expect(validateScan("9".repeat(64))).not.toBeNull();
  });

  it("EAN-13 nazorat raqamini ATAYLAB tekshirmaydi", () => {
    /*
      Do'konlar ichki CODE128 kodlarini ham ishlatadi va qat'iy tekshiruv
      ularni rad etardi. Yaroqsiz kod baribir bazadan topilmaydi —
      "topilmadi" xabari yetarli va aniqroq.
    */
    expect(validateScan("4780010012340")).toBe("4780010012340");
  });
});

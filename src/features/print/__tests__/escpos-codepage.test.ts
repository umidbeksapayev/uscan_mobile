import { codepageCommand, encodeText, normalizeText } from "../escpos-codepage";

describe("codepageCommand", () => {
  it("ESC t bilan sahifa tanlaydi", () => {
    expect(codepageCommand("cp866")).toEqual([0x1b, 0x74, 17]);
    expect(codepageCommand("cp1251")).toEqual([0x1b, 0x74, 73]);
  });
  it("ascii uchun buyruq yubormaydi", () => {
    expect(codepageCommand("ascii")).toEqual([]);
  });
});

describe("normalizeText", () => {
  it("o'zbek lotin apostroflarini ' ga moslaydi", () => {
    expect(normalizeText("soʻm")).toBe("so'm");
    expect(normalizeText("oʼzbek")).toBe("o'zbek");
  });

  it("maxsus belgilarni moslaydi", () => {
    expect(normalizeText("a…b")).toBe("a...b");
    expect(normalizeText("a—b")).toBe("a-b");
  });

  it("kirillni SAQLAYDI (sanitize'dan asosiy farqi)", () => {
    expect(normalizeText("Хива Маркет")).toBe("Хива Маркет");
  });

  it("o'zbek kirillning ikkala sahifada ham yo'q harflarini eng yaqiniga o'tkazadi", () => {
    // Қ/Ғ/Ҳ CP866 da ham, CP1251 da ham yo'q — `?` dan ko'ra `К/Г/Х` o'qiladi.
    expect(normalizeText("Ғишт")).toBe("Гишт");
    expect(normalizeText("қалам")).toBe("калам");
    expect(normalizeText("Ҳовли")).toBe("Ховли");
  });

  it("Ў/ў ni O'ZGARTIRMAYDI — ikkala sahifada ham mavjud", () => {
    expect(normalizeText("Ўзбек")).toBe("Ўзбек");
  });
});

describe("encodeText", () => {
  it("har belgi AYNAN bitta bayt (qator kengligi shunga tayanadi)", () => {
    for (const cp of ["ascii", "cp866", "cp1251"] as const) {
      expect(encodeText("Хива Маркет", cp)).toHaveLength("Хива Маркет".length);
      expect(encodeText("Non 2 dona", cp)).toHaveLength("Non 2 dona".length);
    }
  });

  it("ASCII yarmi barcha sahifalarda bir xil", () => {
    const latin = "Non 2 dona";
    const a = encodeText(latin, "ascii");
    expect(encodeText(latin, "cp866")).toEqual(a);
    expect(encodeText(latin, "cp1251")).toEqual(a);
  });

  it("CP866 kirill chegaralari to'g'ri", () => {
    expect(encodeText("А", "cp866")).toEqual([0x80]);
    expect(encodeText("Я", "cp866")).toEqual([0x9f]);
    expect(encodeText("а", "cp866")).toEqual([0xa0]);
    expect(encodeText("п", "cp866")).toEqual([0xaf]);
    // ⚠️ CP866 da kichik harflar IKKI bo'lakka bo'lingan: р–я alohida diapazon
    expect(encodeText("р", "cp866")).toEqual([0xe0]);
    expect(encodeText("я", "cp866")).toEqual([0xef]);
    expect(encodeText("Ё", "cp866")).toEqual([0xf0]);
    expect(encodeText("ё", "cp866")).toEqual([0xf1]);
    expect(encodeText("Ў", "cp866")).toEqual([0xf6]);
    expect(encodeText("ў", "cp866")).toEqual([0xf7]);
  });

  it("CP1251 kirill chegaralari to'g'ri", () => {
    expect(encodeText("А", "cp1251")).toEqual([0xc0]);
    expect(encodeText("Я", "cp1251")).toEqual([0xdf]);
    expect(encodeText("а", "cp1251")).toEqual([0xe0]);
    expect(encodeText("я", "cp1251")).toEqual([0xff]);
    expect(encodeText("Ё", "cp1251")).toEqual([0xa8]);
    expect(encodeText("ё", "cp1251")).toEqual([0xb8]);
    expect(encodeText("Ў", "cp1251")).toEqual([0xa1]);
    expect(encodeText("ў", "cp1251")).toEqual([0xa2]);
  });

  it("ascii rejimida kirill ? bo'ladi", () => {
    expect(encodeText("Сув", "ascii")).toEqual([0x3f, 0x3f, 0x3f]);
  });

  it("jadvalda yo'q belgi ? bo'ladi (bo'sh chek EMAS)", () => {
    expect(encodeText("日本", "cp866")).toEqual([0x3f, 0x3f]);
    expect(encodeText("😀", "cp1251")[0]).toBe(0x3f);
  });

  it("LF o'tkaziladi (ko'p qatorli matn buzilmaydi)", () => {
    expect(encodeText("a\nb", "cp866")).toEqual([0x61, 0x0a, 0x62]);
  });

  it("bo'sh matn bo'sh natija", () => {
    expect(encodeText("", "cp866")).toEqual([]);
  });
});

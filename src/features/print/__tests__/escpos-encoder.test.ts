import { sanitize, padLine, encodeReceipt, encodeLabel, getCharsPerLine } from "../escpos-encoder";
import { encodeText } from "../escpos-codepage";
import type { ReceiptData } from "../types";
import type { LabelData } from "@/features/labels/barcode-format";

/** baytlar ketma-ketligida sub-array borligini tekshiradi. */
function includesSeq(arr: Uint8Array, seq: number[]): boolean {
  for (let i = 0; i + seq.length <= arr.length; i += 1) {
    if (seq.every((v, j) => arr[i + j] === v)) return true;
  }
  return false;
}

/** Baytlardan ASCII qismini matn qilib oladi (nazorat baytlari tashlanadi). */
function asciiOf(b: Uint8Array): string {
  return Array.from(b)
    .filter((n) => n >= 32 && n <= 126)
    .map((n) => String.fromCharCode(n))
    .join("");
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

describe("getCharsPerLine", () => {
  it("58mm → 32 belgi", () => {
    expect(getCharsPerLine(58)).toBe(32);
  });
  it("80mm → 48 belgi", () => {
    expect(getCharsPerLine(80)).toBe(48);
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
  it("80mm (48 belgi) uchun ham to'g'ri ishlaydi", () => {
    const l = padLine("Kartoshka", "12 000", 48);
    expect(l).toHaveLength(48);
    expect(l.startsWith("Kartoshka")).toBe(true);
    expect(l.endsWith("12 000")).toBe(true);
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
  it("Uint8Array qaytaradi (transportga to'g'ridan-to'g'ri beriladi)", () => {
    const b = encodeReceipt(data);
    expect(b).toBeInstanceOf(Uint8Array);
    expect(b.length).toBeGreaterThan(0);
  });
  it("INIT (ESC @) bilan boshlanadi", () => {
    const b = encodeReceipt(data);
    expect(b[0]).toBe(0x1b);
    expect(b[1]).toBe(0x40);
  });
  it("INIT'dan KEYIN kod sahifasi keladi (ESC @ uni tiklab yuboradi)", () => {
    const b = encodeReceipt(data, { codepage: "cp866" });
    expect(Array.from(b.slice(0, 5))).toEqual([0x1b, 0x40, 0x1b, 0x74, 17]);
  });
  it("ascii rejimida kod sahifasi buyrug'i YUBORILMAYDI", () => {
    const b = encodeReceipt(data, { codepage: "ascii" });
    expect(includesSeq(b, [0x1b, 0x74])).toBe(false);
  });
  it("oxirida CUT (GS V 0)", () => {
    const b = encodeReceipt(data);
    expect(Array.from(b.slice(-3))).toEqual([0x1d, 0x56, 0x00]);
  });
  it("do'kon nomi baytlari mavjud", () => {
    const ascii = asciiOf(encodeReceipt(data));
    expect(ascii).toContain("Dilshod Market");
    expect(ascii).toContain("JAMI");
    expect(ascii).toContain("Shakar 1.250kg");
  });
  it("lotin matn uchun cp866 faqat sahifa buyrug'i bilan farq qiladi", () => {
    // 0x00–0x7F barcha sahifalarda bir xil — lotin do'kon uchun matn o'zgarmaydi,
    // qo'shiladigan yagona narsa boshidagi `ESC t 17` (3 bayt).
    const withCp = encodeReceipt(data, { codepage: "cp866" });
    const ascii = encodeReceipt(data, { codepage: "ascii" });
    expect(withCp.length).toBe(ascii.length + 3);
    // Buyruqni olib tashlasak — bayt-ba-bayt bir xil.
    const stripped = Uint8Array.from([...withCp.slice(0, 2), ...withCp.slice(5)]);
    expect(Array.from(stripped)).toEqual(Array.from(ascii));
  });

  const cyrillic: ReceiptData = {
    ...data,
    shopName: "Хива Маркет",
    items: [{ name: "Сув", saleType: "unit", quantity: 1, unitPrice: 3000, lineTotal: 3000 }],
  };

  it("kirill do'kon nomi cp866 da HAQIQIY baytlar bo'ladi (? EMAS)", () => {
    const b = encodeReceipt(cyrillic, { codepage: "cp866" });
    // "Хива" → Х=0x95, и=0xA8, в=0xA2, а=0xA0
    expect(includesSeq(b, [0x95, 0xa8, 0xa2, 0xa0])).toBe(true);
  });

  it("kirill cp1251 da ham to'g'ri kodlanadi", () => {
    const b = encodeReceipt(cyrillic, { codepage: "cp1251" });
    // "Хива" → Х=0xD5, и=0xE8, в=0xE2, а=0xE0
    expect(includesSeq(b, [0xd5, 0xe8, 0xe2, 0xe0])).toBe(true);
  });

  it("ascii rejimida kirill ? bo'ladi (eski xatti-harakat, oxirgi chora)", () => {
    const b = encodeReceipt(cyrillic, { codepage: "ascii" });
    expect(asciiOf(b)).toContain("????");
  });

  it("kirill qator ham AYNAN `width` bayt egallaydi (tekislash buzilmaydi)", () => {
    /*
      Bu chek tekislanishining asosiy invarianti: `padLine` belgi bo'yicha
      to'ldiradi, printer esa BAYT bo'yicha chizadi. Ular teng bo'lmasa
      summalar o'ng chetdan siljib ketardi. Buyruq baytlarini sanamaslik
      uchun invariantni to'g'ridan-to'g'ri tekshiramiz.
    */
    const line = padLine("Картошка янги 2.500kg", "10 000", 32);
    expect(line).toHaveLength(32);
    for (const cp of ["cp866", "cp1251", "ascii"] as const) {
      expect(encodeText(line, cp)).toHaveLength(32);
    }
  });

  it("juda uzun kirill nom kesiladi, summa joyi saqlanadi", () => {
    const line = padLine("Картошка янги ажойиб сифатли", "10 000", 32);
    expect(line).toHaveLength(32);
    expect(line.endsWith("10 000")).toBe(true);
    expect(encodeText(line, "cp866")).toHaveLength(32);
  });

  it("paperWidth: 80 → divider 48 ta '-'; default (58) → 32 ta '-'", () => {
    const b58 = encodeReceipt(data);
    const b80 = encodeReceipt(data, { paperWidth: 80 });
    expect(asciiOf(b58)).toContain("-".repeat(32));
    expect(asciiOf(b58)).not.toContain("-".repeat(33));
    expect(asciiOf(b80)).toContain("-".repeat(48));
    expect(asciiOf(b80)).not.toContain("-".repeat(49));
  });
});

describe("encodeReceipt — chegaraviy holatlar", () => {
  it("bo'sh chek (mahsulotsiz) — yiqilmaydi, tuzilishi buzilmaydi", () => {
    /*
      Amalda kam uchraydi (UI bo'sh savatni to'lovga yubormaydi), lekin
      encoder o'zi HECH QACHON tashqi tekshiruvga ishonib qolmasligi kerak —
      u navbatdan (`print-queue-runner.ts`) ham chaqiriladi, u yerda
      payload manbasi kelajakda o'zgarishi mumkin.
    */
    const empty: ReceiptData = { ...data, items: [] };
    const b = encodeReceipt(empty);
    expect(b[0]).toBe(0x1b);
    expect(b[1]).toBe(0x40);
    expect(Array.from(b.slice(-3))).toEqual([0x1d, 0x56, 0x00]);
    expect(asciiOf(b)).toContain("JAMI");
  });

  it("nol summali chek — yiqilmaydi", () => {
    const zero: ReceiptData = {
      ...data,
      items: [{ name: "Sinov", saleType: "unit", quantity: 0, unitPrice: 0, lineTotal: 0 }],
      totalRevenue: 0,
      givenAmount: 0,
      changeAmount: 0,
    };
    expect(() => encodeReceipt(zero)).not.toThrow();
  });

  it("juda katta miqdor/summa — bayt oralig'i (0–255) buzilmaydi", () => {
    // Katta yetkazib berish (masalan un, sement) — kg va so'm katta bo'lishi mumkin.
    const bulky: ReceiptData = {
      ...data,
      items: [
        {
          name: "Sement",
          saleType: "weight",
          quantity: 99999.999,
          unitPrice: 1500000,
          lineTotal: 149999998500,
        },
      ],
      totalRevenue: 149999998500,
    };
    const b = encodeReceipt(bulky);
    expect(b.every((n) => n >= 0 && n <= 255)).toBe(true);
    expect(asciiOf(b)).toContain("149 999 998 500");
  });

  it("NaN/Infinity — yiqilmaydi (yuqori oqimdagi hisob xatosidan himoya)", () => {
    // TypeScript buni oldini olsa ham, `number` ATOM sifatida NaN/Infinity
    // qiymatini o'tkazib yuborishi mumkin (masalan 0'ga bo'lish natijasi) —
    // encoder shu holatda ham chekni bloklab qo'ymasligi kerak.
    const broken: ReceiptData = {
      ...data,
      items: [{ name: "Xato", saleType: "unit", quantity: NaN, unitPrice: Infinity, lineTotal: NaN }],
      totalRevenue: NaN,
    };
    expect(() => encodeReceipt(broken)).not.toThrow();
  });

  it("manfiy summa (masalan qisman qaytarilgan sotuv) — yiqilmaydi", () => {
    const negative: ReceiptData = {
      ...data,
      items: [{ name: "Qaytarilgan", saleType: "unit", quantity: -1, unitPrice: 3000, lineTotal: -3000 }],
      totalRevenue: -3000,
    };
    expect(() => encodeReceipt(negative)).not.toThrow();
  });
});

const labels: LabelData[] = [
  { name: "Coca Cola 0.5L", price: 8000, barcode: "20000001", shopName: "Dilshod Market" },
  { name: "Barcode'siz mahsulot", price: 5000, barcode: null },
];

describe("encodeLabel", () => {
  it("INIT bilan boshlanadi, Uint8Array qaytaradi", () => {
    const b = encodeLabel(labels);
    expect(b).toBeInstanceOf(Uint8Array);
    expect(b[0]).toBe(0x1b);
    expect(b[1]).toBe(0x40);
  });

  it("barcode bo'lsa GS k (CODE128) chiqadi + nom baytlari", () => {
    const b = encodeLabel(labels);
    expect(includesSeq(b, [0x1d, 0x6b, 73])).toBe(true); // GS k 73
    expect(asciiOf(b)).toContain("Coca Cola 0.5L");
  });

  it("kirill mahsulot nomi yorliqda ham to'g'ri chiqadi", () => {
    const b = encodeLabel([{ name: "Сув", price: 3000, barcode: null }], { codepage: "cp866" });
    // "Сув" → С=0x91, у=0xE3, в=0xA2
    expect(includesSeq(b, [0x91, 0xe3, 0xa2])).toBe(true);
  });

  it("barcode kirill sahifadan QAT'I NAZAR sof ASCII qoladi", () => {
    // CODE128 ma'lumoti grafik sifatida talqin qilinadi — sahifaga bog'liq emas.
    const b = encodeLabel([{ name: "Сув", price: 3000, barcode: "20000001" }], {
      codepage: "cp866",
    });
    expect(includesSeq(b, [0x7b, 0x43])).toBe(true); // "{C"
    expect(includesSeq(b, [20, 0, 0, 1])).toBe(true);
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
    expect(Array.from(b.slice(-3))).toEqual([0x1d, 0x56, 0x00]);
  });
});

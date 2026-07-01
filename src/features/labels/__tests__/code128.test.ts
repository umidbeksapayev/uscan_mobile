import { code128Binary } from "../code128";

const START_B = "11010010000"; // pattern[104]
const START_C = "11010011100"; // pattern[105]
const STOP = "1100011101011"; // pattern[106] (13 modul)

describe("code128Binary", () => {
  it("juft-raqamli kod Code C bilan boshlanadi (zich)", () => {
    const bin = code128Binary("12345678");
    expect(bin.startsWith(START_C)).toBe(true);
    expect(bin.endsWith(STOP)).toBe(true);
  });

  it("Code C 2× qisqa: 8 raqam = start+4 juft+nazorat+stop = 79 modul", () => {
    // start(11) + 4 juft*(11) + checksum(11) + stop(13) = 79
    expect(code128Binary("12345678")).toHaveLength(11 * 6 + 13);
  });

  it("raqamsiz boshlanuvchi kod Code B bilan boshlanadi", () => {
    const bin = code128Binary("ABC-123");
    expect(bin.startsWith(START_B)).toBe(true);
    expect(bin.endsWith(STOP)).toBe(true);
  });

  it("faqat '0'/'1' moduldan iborat", () => {
    expect(/^[01]+$/.test(code128Binary("20000001"))).toBe(true);
    expect(/^[01]+$/.test(code128Binary("ABC-123"))).toBe(true);
  });

  it("deterministik (bir xil kirish → bir xil chiqish)", () => {
    expect(code128Binary("29999999")).toBe(code128Binary("29999999"));
  });

  it("toq sonli raqam ham ishlaydi (Code C→B qoldiq)", () => {
    const bin = code128Binary("12345"); // 5 raqam
    expect(/^[01]+$/.test(bin)).toBe(true);
    expect(bin.endsWith(STOP)).toBe(true);
  });

  it("printable ASCII bo'lmagan belgida xato otadi", () => {
    expect(() => code128Binary("ABC\nDEF")).toThrow();
  });

  it("bo'sh qiymatda xato otadi", () => {
    expect(() => code128Binary("")).toThrow();
  });
});

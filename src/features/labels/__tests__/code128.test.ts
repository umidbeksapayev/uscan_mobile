import { code128Binary } from "../code128";

const START_B = "11010010000"; // pattern[104]
const STOP = "1100011101011"; // pattern[106] (13 modul)

describe("code128Binary", () => {
  it("Start-B bilan boshlanadi va Stop bilan tugaydi", () => {
    const bin = code128Binary("12345678");
    expect(bin.startsWith(START_B)).toBe(true);
    expect(bin.endsWith(STOP)).toBe(true);
  });

  it("faqat '0'/'1' moduldan iborat", () => {
    expect(/^[01]+$/.test(code128Binary("ABC-123"))).toBe(true);
  });

  it("uzunlik = 11*(N+2) + 13 (start+data+checksum 11 modul, stop 13)", () => {
    // N = belgi soni; start + N + checksum = (N+2) ta 11-modul, stop 13
    expect(code128Binary("0")).toHaveLength(11 * 3 + 13); // N=1 → 46
    expect(code128Binary("12345678")).toHaveLength(11 * 10 + 13); // N=8 → 123
  });

  it("deterministik (bir xil kirish → bir xil chiqish)", () => {
    expect(code128Binary("29999999")).toBe(code128Binary("29999999"));
  });

  it("printable ASCII bo'lmagan belgida xato otadi", () => {
    expect(() => code128Binary("")).toThrow();
    expect(() => code128Binary("ABC\nDEF")).toThrow();
  });

  it("bo'sh qiymatda xato otadi", () => {
    expect(() => code128Binary("")).toThrow();
  });
});

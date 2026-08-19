import { shouldAcceptScan, REARM_GAP_MS, type ScanGate } from "../scan-dedup";

const gate = (code: string, seenAt: number): ScanGate => ({ code, seenAt });

describe("shouldAcceptScan", () => {
  it("birinchi skanni qabul qiladi", () => {
    expect(shouldAcceptScan("111", null, 1000)).toBe(true);
  });

  it("BOSHQA kodni DARHOL qabul qiladi — kutish yo'q", () => {
    /*
      Eski xatti-harakatning asosiy nuqsoni shu edi: 900ms qulf boshqa
      mahsulotni ham to'sardi. Kassir ikkinchi mahsulotni skanerlaganda
      hech qanday kechikish bo'lmasligi kerak.
    */
    expect(shouldAcceptScan("222", gate("111", 1000), 1001)).toBe(true);
  });

  it("kadrda TURGAN o'sha kodni takror qabul qilmaydi", () => {
    // Kamera sekundiga o'nlab kadr beradi — hammasi bitta mahsulot.
    expect(shouldAcceptScan("111", gate("111", 1000), 1050)).toBe(false);
    expect(shouldAcceptScan("111", gate("111", 1000), 1000 + REARM_GAP_MS)).toBe(false);
  });

  it("kod kadrni tark etib qaytsa — qayta qabul qiladi", () => {
    // Kassir uchta bir xil shishani ketma-ket skanerlaydi.
    expect(shouldAcceptScan("111", gate("111", 1000), 1000 + REARM_GAP_MS + 1)).toBe(true);
  });

  it("tanaffus odam mahsulot almashtirish vaqtidan qisqa", () => {
    // ~500ms — odam mahsulotni almashtirishi. Tanaffus undan past bo'lishi
    // shart, aks holda ataylab qayta skanerlash "ishlamadi" bo'lib ko'rinardi.
    expect(REARM_GAP_MS).toBeLessThan(500);
  });

  it("tanaffus kamera kadr oralig'idan uzun", () => {
    // ~200ms — sekin qurilmadagi kadr oralig'i. Tanaffus undan uzun bo'lmasa
    // uzluksiz turgan kod ikki marta sanalardi.
    expect(REARM_GAP_MS).toBeGreaterThan(200);
  });
});

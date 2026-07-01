import { isMiscProduct, MISC_BARCODE } from "../misc-barcode";

describe("isMiscProduct", () => {
  it("MISC_BARCODE bilan mos kelsa true", () => {
    expect(isMiscProduct({ barcode: MISC_BARCODE })).toBe(true);
  });

  it("boshqa/bo'sh shtrix-kodda false", () => {
    expect(isMiscProduct({ barcode: "4780000000000" })).toBe(false);
    expect(isMiscProduct({ barcode: null })).toBe(false);
  });
});

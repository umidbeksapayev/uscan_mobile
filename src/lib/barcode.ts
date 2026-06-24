/**
 * Barcode yordamchilari — web lib/utils.ts dagi mantiqqa MOS.
 */

/** Faqat harf/raqam qoldiradi (probel va belgilarni olib tashlaydi). */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").trim();
}

/**
 * Bitta skanlangan kod uchun ekvivalent variantlar (UPC-A 12 ↔ EAN-13 13,
 * yetakchi nol muammosi). Skaner yetakchi "0" ni tushirib qoldirsa ham lookup
 * mahsulotni topadi. Faqat raqamli kodlarga taalluqli.
 */
export function barcodeVariants(raw: string): string[] {
  const norm = normalizeBarcode(raw);
  const out = new Set<string>();
  if (norm) out.add(norm);

  if (/^\d+$/.test(norm)) {
    if (norm.length === 12) out.add("0" + norm); // UPC-A → EAN-13
    if (norm.length === 13 && norm.startsWith("0")) out.add(norm.slice(1)); // EAN-13 → UPC-A
  }

  return Array.from(out);
}

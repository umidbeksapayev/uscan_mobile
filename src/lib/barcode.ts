/**
 * Barcode yordamchilari — web lib/utils.ts dagi mantiqqa MOS.
 */

/** Faqat harf/raqam qoldiradi (probel va belgilarni olib tashlaydi). */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").trim();
}

/** EAN-13 nazorat raqamini tekshiradi (kerak bo'lsa). */
export function isValidEan13(v: string): boolean {
  if (!/^\d{13}$/.test(v)) return false;
  const d = v.split("").map(Number);
  const sum = d.slice(0, 12).reduce((s, n, i) => s + n * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === d[12];
}

/**
 * Barcode'siz mahsulot uchun ICHKI barcode generatsiya qiladi (web bilan bir xil).
 * 8 xonali, "2" bilan boshlanadi (do'kon-ichki diapazon). Qisqa kod = CODE128'da
 * KENG chiziqlar = ishonchli skan. Do'kon ichida UNIQUE bo'lishi DB'da tekshiriladi
 * (uq_products_shop_barcode indeksi, migration 009).
 */
export function generateInternalBarcode(): string {
  return String(20000000 + Math.floor(Math.random() * 10000000)); // 20000000–29999999
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

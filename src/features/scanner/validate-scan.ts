import { normalizeBarcode } from "@/lib/barcode";

/**
 * Skanerlangan kodni tozalash va ma'qulligini tekshirish — SOF funksiya.
 *
 * ⚠️ ALOHIDA faylda: `scan-pipeline.ts` supabase client'ini import qiladi va
 * uni Jest'da yuklab bo'lmaydi (native modul). Bu loyihada bor naqsh —
 * `misc-barcode.ts` ham aynan shu sababdan `misc-product.ts` dan ajratilgan.
 */

/** Yuqori chegara — HID skaner "adashib" yuborgan axlatni to'sadi. */
const MAX_CODE_LENGTH = 64;
/** Pastki chegara — bitta-ikkita tasodifiy belgi shtrix-kod bo'lolmaydi. */
const MIN_CODE_LENGTH = 3;

/**
 * Kodni tozalab qaytaradi; yaroqsiz bo'lsa `null`.
 *
 * ⚠️ Ataylab YUMSHOQ tekshiruv: EAN-13 nazorat raqami TEKSHIRILMAYDI. Do'konlar
 * ichki CODE128 kodlarini ham ishlatadi va qat'iy tekshiruv ularni rad etardi.
 * Yaroqsiz kod baribir bazadan topilmaydi — "topilmadi" xabari aniqroq.
 */
export function validateScan(raw: string): string | null {
  const code = normalizeBarcode(raw);
  if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) return null;
  return code;
}

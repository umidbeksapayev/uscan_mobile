import { generateInternalBarcode, isValidEan13 } from "@/lib/barcode";

/**
 * Yorliq (narx etiketkasi) ma'lumotlari + format — SOF (DOM'siz). Ham HTML
 * (label-template), ham termal (escpos-encoder) yo'llari shu yerdan oladi.
 */

export interface LabelData {
  name: string;
  /** selling_price (so'm). */
  price: number;
  /** Mahsulot barcode'i (yo'q bo'lsa — barcode chizilmaydi). */
  barcode: string | null;
  /** Do'kon nomi (ixtiyoriy). */
  shopName?: string;
}

export type BarcodeFormat = "CODE128";

/**
 * Yorliqlarda DOIM CODE128: raqamlar ZICH joylashadi (telefon ishonchli o'qiydi).
 * CODE128 EAN-13 raqamlarini ham o'sha qiymat bilan kodlaydi → checkout skani mos.
 */
export const LABEL_BARCODE_FORMAT: BarcodeFormat = "CODE128";

export { generateInternalBarcode, isValidEan13 };

/**
 * Printer transport abstraksiyasi.
 *
 * UI va chek mantiqi HECH QACHON `react-native-bluetooth-classic` yoki
 * `expo-print` ni ko'rmaydi — faqat shu interfeysni. Bluetooth kutubxonasi
 * almashtirilsa yoki tarmoq printeri qo'shilsa, `escpos-encoder.ts` ham,
 * chaqiruvchi ekranlar ham o'zgarmaydi.
 */

/** Qaysi turdagi printer. `network` — B8 da qo'shiladi (interfeys tayyor). */
export type PrinterKind = "system" | "bluetooth" | "network";

export interface PrinterTarget {
  kind: PrinterKind;
  /** Bluetooth MAC manzili yoki tarmoq `IP:port`. `system` uchun null. */
  address: string | null;
  /** Foydalanuvchiga ko'rsatiladigan nom. */
  name: string | null;
}

/**
 * Chop etiladigan hujjat IKKI ko'rinishda beriladi — har transport o'ziga
 * keragini oladi: xom transportlar (Bluetooth/tarmoq) ESC-POS baytlarni,
 * tizim printeri esa HTML'ni.
 *
 * Getterlar DANGASA (funksiya, tayyor qiymat emas): tizim printeri ESC-POS
 * baytlarini hech qachon hisoblamaydi va aksincha.
 */
export interface PrintDocument {
  /** Jurnal va navbat uchun qisqa nom — "Chek #A1B2C3". Maxfiy ma'lumot YO'Q. */
  readonly title: string;
  escpos(): Uint8Array;
  html(): string;
}

export interface PrinterTransport {
  readonly kind: PrinterKind;

  /**
   * Ulanadi. Allaqachon ulangan bo'lsa jim o'tadi (idempotent).
   * Ulanishsiz transportlar (tizim printeri) uchun — no-op.
   */
  connect(target: PrinterTarget): Promise<void>;

  /** Hujjatni yozadi. Chaqirilishidan oldin `connect` bajarilgan bo'ladi. */
  write(doc: PrintDocument, target: PrinterTarget): Promise<void>;

  /** Uzadi. Xato bo'lsa yutiladi — uzish hech qachon oqimni to'xtatmaydi. */
  disconnect(target: PrinterTarget): Promise<void>;

  /**
   * Transport ulanishni o'zi tekshira olsa — shu. Aniqlab bo'lmasa
   * berilmaydi va menejer o'z holatiga tayanadi.
   */
  isConnected?(target: PrinterTarget): Promise<boolean>;
}

/** Manzil talab qiladigan transportlar uchun yagona xato matni. */
export function requireAddress(target: PrinterTarget): string {
  if (!target.address) {
    throw new Error(`Printer manzili sozlanmagan (${target.kind})`);
  }
  return target.address;
}

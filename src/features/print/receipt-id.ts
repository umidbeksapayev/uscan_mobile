/**
 * Chek raqami — uzun UUID'dan odam o'qiy oladigan qisqa ko'rinish.
 *
 * Ilgari bu mantiq IKKI joyda takrorlangan edi (`escpos-encoder.ts` va
 * `receipt-template.ts`) va ular bir-biridan farq qilardi: HTML varianti
 * `qr-` prefiksini olib tashlamasdi, ya'ni bir xil sotuv termal chekda va
 * PDF'da BOSHQA raqam bilan chiqardi.
 */
export function shortReceiptId(id: string): string {
  const clean = id.replace(/^offline-/, "").replace(/^qr-/, "");
  return clean.length > 8 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
}

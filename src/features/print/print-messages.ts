import i18n from "@/i18n";

import type { PrintErrorKind } from "./printer-state";

/**
 * Chop etish xatosining FOYDALANUVCHI ko'radigan matni.
 *
 * ⚠️ Texnik xabar ("BluetoothGattError: status 133") hech qachon ekranga
 * chiqmaydi — u `logError` orqali Diagnostika jurnaliga yoziladi (u yerda
 * ham token/parol tozalanadi, `log-buffer.redact`). Bu yerda faqat kassir
 * nima qilishi kerakligi aytiladi.
 *
 * ⚠️ `t()` hook ORQALI EMAS, `i18n.t` bilan: bu fayl komponent emas, uni
 * navbat bajaruvchisi (React daraxtidan tashqarida) ham chaqiradi.
 */
export function printErrorMessage(kind: PrintErrorKind): string {
  return i18n.t(`printError.${kind}`);
}

/**
 * UUID v4 (RFC 4122). process_sale_cart p_client_id uchun — DB `uuid` tipini
 * kutadi (idempotency). Imkon bo'lsa expo-crypto CSPRNG ishlatadi (Math.random
 * EMAS) → offline navbat client_id to'qnashuvi xavfi yo'q.
 *
 * ⚠️ expo-crypto NATIVE modul: u mavjud BO'LMAGAN binarda (masalan eski dev build,
 * yoki OTA JS yangilanishi eski binarga tushganda) top-level import O'ZI yiqiladi
 * ("Cannot find native module 'ExpoCrypto'") va ilovani butunlay qulatadi.
 * Shuning uchun LAZY require + fallback: native bo'lsa randomUUID(), bo'lmasa
 * Math.random asosidagi v4 (idempotency baribir DB UNIQUE bilan himoyalangan).
 */

function fallbackUuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function uuidv4(): string {
  try {
    // Lazy — top-level import bo'lsa eski build'da modul yuklanishida yiqilardi.
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");
    return Crypto.randomUUID();
  } catch {
    return fallbackUuidv4();
  }
}

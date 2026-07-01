import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * UUID v4 (RFC 4122). process_sale_cart p_client_id uchun — DB `uuid` tipini
 * kutadi (idempotency). Imkon bo'lsa expo-crypto CSPRNG ishlatadi (Math.random
 * EMAS) → offline navbat client_id to'qnashuvi xavfi yo'q.
 *
 * ⚠️ expo-crypto NATIVE modul. Uni o'z ichiga olmagan binarda (eski dev build,
 * yoki OTA JS eski binarga tushganda) `import "expo-crypto"` / `requireNativeModule`
 * O'ZI yiqiladi va ilovani qulatadi ("Cannot find native module 'ExpoCrypto'").
 * Shu sabab `requireOptionalNativeModule` — modul bo'lmasa `null` qaytaradi (OTMAYDI);
 * bunda Math.random asosidagi v4 ishlatiladi (idempotency baribir DB UNIQUE bilan
 * himoyalangan). Yangi build'da CSPRNG saqlanadi.
 */
const ExpoCrypto = requireOptionalNativeModule<{ randomUUID(): string }>("ExpoCrypto");

function fallbackUuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function uuidv4(): string {
  try {
    const id = ExpoCrypto?.randomUUID();
    if (id) return id;
  } catch {
    /* native chaqiruv xatosi — fallback */
  }
  return fallbackUuidv4();
}

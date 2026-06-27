import * as Crypto from "expo-crypto";

/**
 * UUID v4 (RFC 4122). process_sale_cart p_client_id uchun — DB `uuid` tipini
 * kutadi (idempotency). expo-crypto CSPRNG ishlatadi (Math.random EMAS), shuning
 * uchun offline sotuv navbatida client_id to'qnashuvi (xato "duplikat") xavfi yo'q.
 */
export function uuidv4(): string {
  return Crypto.randomUUID();
}

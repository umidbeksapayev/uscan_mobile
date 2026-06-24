/**
 * UUID v4 (RFC 4122). process_sale_cart p_client_id uchun — DB `uuid` tipini
 * kutadi (idempotency). Crypto-mustahkam emas, lekin idempotentlik uchun yetarli.
 */
export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

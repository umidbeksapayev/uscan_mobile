import type { CartItem } from "./cart-store";

/**
 * Savat jami (so'm). Har element TIYINda yaxlitlanadi (float drift yo'q),
 * keyin so'mga qaytariladi. Bu faqat ko'rsatish/oldindan ko'rish uchun —
 * haqiqiy summa process_sale_cart RPC'da server tomonida hisoblanadi.
 */
export function cartTotal(items: CartItem[]): number {
  const tiyin = items.reduce(
    (sum, i) => sum + Math.round(i.product.selling_price * 100 * i.quantity),
    0,
  );
  return tiyin / 100;
}

/** Savatdagi elementlar soni (turlar soni, miqdor emas). */
export function cartCount(items: CartItem[]): number {
  return items.length;
}

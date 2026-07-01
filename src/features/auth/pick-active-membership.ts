import type { Membership } from "@/types/database";

/**
 * Tanlangan do'kon ro'yxatda topilmasa (masalan, xodimlikdan chiqarilgan) yoki
 * hali tanlanmagan bo'lsa → eng yangi a'zolikka tushadi. Sof funksiya (alohida
 * faylda — `use-memberships.ts` supabase client'ni import qiladi, bu esa
 * Jest'da native-modul xatosiga olib keladi).
 */
export function pickActiveMembership(
  memberships: Membership[],
  activeShopId: string | null,
): Membership | undefined {
  if (memberships.length === 0) return undefined;
  const selected = activeShopId ? memberships.find((m) => m.shop.id === activeShopId) : undefined;
  return selected ?? memberships[0];
}

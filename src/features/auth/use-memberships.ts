import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Membership, MemberRole, MemberPermissions, Shop } from "@/types/database";
import { useAuth } from "./auth-context";
import { canDo } from "./permissions";
import { useActiveShopStore } from "./active-shop-store";
import { pickActiveMembership } from "./pick-active-membership";

/**
 * Joriy foydalanuvchining a'zoliklari (do'kon + rol + ruxsat).
 * Eng yangi birinchi — [0] default faol do'kon. (Web membership.ts ga mos.)
 */
export function useMemberships() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["memberships", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Membership[]> => {
      // ATAYLAB `supabase.auth.getUser()` EMAS: u qo'shimcha GoTrue
      // chaqiruvi va RN'da osilib qolishi mumkin (`lib/supabase.ts`dagi
      // `noopLock` izohi). Osilganda bu so'rov hech qachon tugamasdi,
      // `AuthGate` esa "a'zoliklar hali hal bo'lmadi" deb kutib turardi —
      // natijada login muvaffaqiyatli bo'lsa ham foydalanuvchi kirish
      // ekranida XATOSIZ qotib qolardi (qurilmada tasdiqlangan).
      // `session.user.id` allaqachon qo'limizda — tarmoqqa chiqish shart emas.
      const { data, error } = await supabase
        .from("shop_members")
        .select("role, permissions, shop:shops(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      // Xatoni YUTMAYMIZ. Ilgari `return []` qilinardi — bu tarmoq xatosini
      // "do'koni yo'q" deb ko'rsatardi va do'kon EGASINI onboarding'ga
      // uloqtirardi. `AuthGate` ataylab `isSuccess` ni tekshiradi (xatoda
      // hech qayerga yo'naltirmaydi) — buning ishlashi uchun xato
      // haqiqatan ham xato bo'lib qaytishi kerak.
      if (error) throw new Error(error.message);

      return (data ?? [])
        .filter((d) => d.shop)
        .map((d) => ({
          shop: d.shop as unknown as Shop,
          role: d.role as MemberRole,
          permissions: (d.permissions ?? {}) as MemberPermissions,
        }));
    },
  });
}

/**
 * Faol a'zolik — foydalanuvchi tanlagan do'kon (MMKV, ilova qayta ochilganda
 * ham eslab qoladi). Barcha "faol do'kon"ga bog'liq ma'lumot so'rovlari shu
 * yerdan o'tishi kerak — ko'p-do'konli foydalanuvchida aniq filtr shart (RLS
 * BARCHA a'zo do'konlarni qaytaradi).
 */
export function useActiveMembership(): Membership | undefined {
  const { data } = useMemberships();
  const activeShopId = useActiveShopStore((s) => s.activeShopId);
  return pickActiveMembership(data ?? [], activeShopId);
}

/** Faol do'kon id — {@link useActiveMembership} ning qisqartmasi. */
export function useActiveShopId(): string | undefined {
  return useActiveMembership()?.shop.id;
}

export interface ActivePermissions {
  isOwner: boolean;
  canManageProducts: boolean;
  canViewReports: boolean;
  canViewCost: boolean;
  canManageDebt: boolean;
  canPurchase: boolean;
  canReturn: boolean;
}

/**
 * Faol do'kondagi ruxsatlar (RBAC). Egasi = hammasi. Kassir = `permissions`
 * jadvalidagi bayroqlar. UI shu asosda tan narx/foyda/savdo moliyani yashiradi
 * (server ham has_perm bilan majburlaydi — bu faqat UX qatlami).
 */
export function useActivePermissions(): ActivePermissions {
  const m = useActiveMembership();
  return {
    isOwner: m?.role === "owner",
    canManageProducts: canDo(m?.role, m?.permissions, "manage_products"),
    canViewReports: canDo(m?.role, m?.permissions, "view_reports"),
    canViewCost: canDo(m?.role, m?.permissions, "view_cost"),
    canManageDebt: canDo(m?.role, m?.permissions, "manage_debt"),
    canPurchase: canDo(m?.role, m?.permissions, "purchase"),
    canReturn: canDo(m?.role, m?.permissions, "returns"),
  };
}

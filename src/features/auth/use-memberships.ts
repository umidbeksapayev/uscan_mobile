import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Membership, MemberRole, MemberPermissions, Shop } from "@/types/database";
import { useAuth } from "./auth-context";

/**
 * Joriy foydalanuvchining a'zoliklari (do'kon + rol + ruxsat).
 * Eng yangi birinchi — [0] default faol do'kon. (Web membership.ts ga mos.)
 */
export function useMemberships() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["memberships", session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<Membership[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("shop_members")
        .select("role, permissions, shop:shops(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      return data
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
 * Faol do'kon id (default = eng yangi a'zolik). Ma'lumot so'rovlarini shu do'konga
 * cheklash uchun — RLS a'zo bo'lgan BARCHA do'konlarni qaytaradi, shuning uchun
 * ko'p-do'konli foydalanuvchida aniq filtr shart. F8 switcher shu yerga ulanadi.
 */
export function useActiveShopId(): string | undefined {
  const { data } = useMemberships();
  return data?.[0]?.shop.id;
}

export interface ActivePermissions {
  isOwner: boolean;
  canViewReports: boolean;
  canViewCost: boolean;
}

/**
 * Faol do'kondagi ruxsatlar (RBAC). Egasi = hammasi. Kassir = `permissions`
 * jadvalidagi bayroqlar. UI shu asosda tan narx/foyda/savdo moliyani yashiradi
 * (server ham has_perm bilan majburlaydi — bu faqat UX qatlami).
 */
export function useActivePermissions(): ActivePermissions {
  const { data } = useMemberships();
  const m = data?.[0];
  const isOwner = m?.role === "owner";
  return {
    isOwner,
    canViewReports: isOwner || !!m?.permissions?.view_reports,
    canViewCost: isOwner || !!m?.permissions?.view_cost,
  };
}

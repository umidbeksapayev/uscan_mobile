import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

/**
 * O'z profili (`profiles` RLS: `id = auth.uid()` o'qiy oladi).
 *
 * `maybeSingle()` — qator hali yo'q bo'lishi mumkin (juda eski hisob yoki
 * trigger ishlamay qolgan holat). Bunda `null` qaytadi va ekran email'ga
 * asoslangan ko'rinishni ko'rsatadi; birinchi saqlashda RPC qatorni o'zi
 * yaratadi.
 */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, language")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

/**
 * Ism/rasmni saqlaydi. To'g'ridan-to'g'ri UPDATE EMAS — `profiles` da `role`
 * ustuni ham bor va o'z-qatorini yozish siyosati berilsa foydalanuvchi
 * o'zini `super_admin` qilib qo'yishi mumkin edi (046_profile.sql izohi).
 *
 * Berilmagan (undefined) maydon o'zgarmaydi, `null` esa tozalaydi.
 */
export async function updateMyProfile(input: {
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("update_my_profile", {
    // RPC'da NULL = "o'zgartirma", bo'sh satr = "tozala".
    p_full_name: input.fullName === undefined ? null : (input.fullName ?? ""),
    p_avatar_url: input.avatarUrl === undefined ? null : (input.avatarUrl ?? ""),
  });
  if (error) throw new Error(error.message);
}

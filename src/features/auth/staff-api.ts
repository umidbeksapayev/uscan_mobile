import { supabase } from "@/lib/supabase";
import type { MemberRole, MemberPermissions, ShopMemberRow } from "@/types/database";

/** Xodimlar ro'yxati (email + rol + ruxsat) — RPC faqat egaga ruxsat beradi. */
export async function listShopMembers(shopId: string): Promise<ShopMemberRow[]> {
  const { data, error } = await supabase.rpc("list_shop_members", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return (data ?? []) as ShopMemberRow[];
}

/** Email orqali mavjud foydalanuvchini xodim qilib biriktirish. */
export async function addShopMember(
  shopId: string,
  email: string,
  role: MemberRole = "cashier",
): Promise<void> {
  const { error } = await supabase.rpc("add_shop_member", {
    p_shop_id: shopId,
    p_email: email.trim(),
    p_role: role,
  });
  if (error) throw new Error(error.message);
}

export async function removeShopMember(shopId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_shop_member", {
    p_shop_id: shopId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export async function setMemberPermissions(
  shopId: string,
  userId: string,
  permissions: MemberPermissions,
): Promise<void> {
  const { error } = await supabase.rpc("set_member_permissions", {
    p_shop_id: shopId,
    p_user_id: userId,
    p_permissions: permissions,
  });
  if (error) throw new Error(error.message);
}

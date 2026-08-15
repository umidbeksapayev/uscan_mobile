import { supabase } from "@/lib/supabase";
import type { MemberRole, ShopInviteRow, MyInviteRow } from "@/types/database";

/** Ega: kassirni email bilan taklif qilish (u ro'yxatdan o'tgan-o'tmaganidan qat'i nazar). */
export async function inviteShopMember(
  shopId: string,
  email: string,
  role: MemberRole = "cashier",
): Promise<ShopInviteRow> {
  const { data, error } = await supabase.rpc("invite_shop_member", {
    p_shop_id: shopId,
    p_email: email.trim(),
    p_role: role,
  });
  if (error) throw new Error(error.message);
  return data as ShopInviteRow;
}

/** Ega: hali javob berilmagan taklifni bekor qilish. */
export async function cancelShopInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_shop_invite", { p_invite_id: inviteId });
  if (error) throw new Error(error.message);
}

/** Ega: o'z do'konining kutilayotgan takliflari ro'yxati. */
export async function listShopInvites(shopId: string): Promise<ShopInviteRow[]> {
  const { data, error } = await supabase.rpc("list_shop_invites", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return (data ?? []) as ShopInviteRow[];
}

/** Taklif qilingan: o'ziga (emailiga) kelgan kutilayotgan takliflar. */
export async function listMyInvites(): Promise<MyInviteRow[]> {
  const { data, error } = await supabase.rpc("list_my_invites");
  if (error) throw new Error(error.message);
  return (data ?? []) as MyInviteRow[];
}

/** Taklif qilingan: qabul qilish yoki rad etish. Qabulda `shop_id` qaytadi. */
export async function respondShopInvite(
  inviteId: string,
  accept: boolean,
): Promise<{ accepted: boolean; shop_id?: string }> {
  const { data, error } = await supabase.rpc("respond_shop_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
  return data as { accepted: boolean; shop_id?: string };
}

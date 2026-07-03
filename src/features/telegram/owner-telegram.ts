import { supabase } from "@/lib/supabase";
import type { SummaryTime } from "@/types/database";

/** Markaziy uscan boti (deep-link uchun) — web lib/owner-telegram.ts bilan bir xil. */
export const BOT_USERNAME = "uscanUZ_bot";

/**
 * Egani Telegram'ga ulash uchun bir martalik token oladi va deep-link qaytaradi.
 * Ega botda havolani ochib /start <token> yuboradi → bot (web backend webhook)
 * egani do'konga bog'laydi. RPC owner-gated (migration 027).
 */
export async function createOwnerLinkUrl(shopId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_owner_link_token", {
    p_shop_id: shopId,
  });
  if (error) throw new Error(error.message);
  return `https://t.me/${BOT_USERNAME}?start=${data as string}`;
}

/** Egaga kunlik xulosa vaqtini o'rnatadi (shops RLS: faqat ega yozadi). */
export async function updateSummaryTime(shopId: string, time: SummaryTime): Promise<void> {
  const { error } = await supabase.from("shops").update({ summary_time: time }).eq("id", shopId);
  if (error) throw new Error(error.message);
}

import { supabase } from "@/lib/supabase";
import type { LangCode } from "@/i18n";

/**
 * Do'kon yaratadi (yangi egaga) — `040_onboarding.sql` dagi
 * `complete_onboarding()` RPC. Atomar: shops + shop_members(owner) +
 * onboarded_at bitta tranzaksiyada. Xato bo'lsa DB'dagi kod (masalan
 * `already_onboarded`) `error.message` ichida keladi —
 * `onboarding-errors.ts` uni o'qiydi.
 *
 * Qaytadigan qiymat — yangi do'kon id'si (hozircha ishlatilmaydi, kelajakda
 * kerak bo'lishi mumkin).
 */
export async function completeOnboarding(shopName: string, language: LangCode): Promise<string> {
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_shop_name: shopName,
    p_language: language,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

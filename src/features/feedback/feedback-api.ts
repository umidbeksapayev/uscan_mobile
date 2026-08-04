import { supabase } from "@/lib/supabase";
import { validateFeedback, type FeedbackCategory } from "./validate-feedback";

/**
 * Fikr-mulohazani `feedback` jadvaliga yozish (migration `028_feedback.sql`).
 *
 * RLS: `feedback_insert_own` — `auth.uid() = user_id`, shuning uchun `user_id`
 * joriy sessiyadan olinadi (client'dan uzatilmaydi). SELECT policy yo'q —
 * yozilgan fikrni ilova qayta o'qiy olmaydi, bu ataylab shunday.
 *
 * ⚠️ Web `/api/feedback` route'i qo'shimcha ravishda adminga Telegram xabari
 * yuboradi. Mobil ilova (boshqa hamma yo'l kabi) to'g'ridan-to'g'ri Supabase'ga
 * yozadi — ya'ni mobil fikrlar uchun Telegram xabari kelmaydi, lekin yozuv
 * DB'da saqlanadi va yo'qolmaydi.
 */
export async function submitFeedback(input: {
  shopId: string | null;
  category: FeedbackCategory;
  message: string;
}): Promise<void> {
  const invalid = validateFeedback(input);
  if (invalid) throw new Error(invalid);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("noSession");

  const { error } = await supabase.from("feedback").insert({
    shop_id: input.shopId,
    user_id: user.id,
    email: user.email ?? null,
    category: input.category,
    message: input.message.trim(),
  });
  if (error) throw new Error(error.message);
}

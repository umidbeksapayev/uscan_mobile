import { useMutation } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { submitFeedback } from "./feedback-api";
import type { FeedbackCategory } from "./validate-feedback";

/**
 * Fikr yuborish. Cache invalidatsiya qilinmaydi — `feedback` jadvalida SELECT
 * policy yo'q, ya'ni o'qiladigan ro'yxat mavjud emas.
 */
export function useSubmitFeedback() {
  const shopId = useActiveShopId();
  return useMutation({
    mutationFn: (input: { category: FeedbackCategory; message: string }) =>
      submitFeedback({ shopId: shopId ?? null, ...input }),
  });
}

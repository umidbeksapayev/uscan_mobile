import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LangCode } from "@/i18n";
import { completeOnboarding } from "./onboarding-api";

/**
 * Onboarding'ni yakunlash — do'kon yaratadi (RPC). Muvaffaqiyatdan so'ng
 * `memberships` keshini yangilaymiz: `useActiveMembership()` yangi (yagona)
 * a'zolikni darhol ko'radi va AuthGate onboarding holatidan chiqadi —
 * qo'lda yo'naltirish shart emas.
 */
export function useCompleteOnboarding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ shopName, language }: { shopName: string; language: LangCode }) =>
      completeOnboarding(shopName, language),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

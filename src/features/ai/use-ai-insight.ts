import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { meta, MetaKeys } from "@/lib/offline/mmkv";

interface InsightResponse {
  text: string;
  cached: boolean;
}

/**
 * Kunlik AI xulosasi — Bosh ekranda so'ralmasdan chiqadi.
 *
 * Server kuniga bir marta hisoblab, `ai_insights` da keshlaydi; bu yerdagi
 * `staleTime` esa qayta-qayta so'rov yuborilishining oldini oladi (ilova
 * kun davomida ko'p marta ochiladi/fokusga qaytadi).
 *
 * ⚠️ Rozilik berilmagan bo'lsa so'rov UMUMAN yuborilmaydi — xulosa ham
 * do'kon ma'lumotini Gemini'ga jo'natadi, ya'ni chat bilan bir xil shart.
 */
export function useAiInsight(shopId: string | undefined, enabled: boolean) {
  const consent = meta.getBool(MetaKeys.aiConsent);

  return useQuery({
    queryKey: ["ai-insight", shopId],
    enabled: Boolean(shopId) && enabled && consent,
    // Server kunlik keshga ega — klientda soatlik yetarli.
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<InsightResponse>("ai-chat", {
        body: { shop_id: shopId, insight: true },
      });
      if (error) throw error;
      return data?.text ?? "";
    },
  });
}

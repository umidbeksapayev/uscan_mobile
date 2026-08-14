import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useAiInsight } from "./use-ai-insight";

/**
 * Bosh ekrandagi kunlik AI xulosasi.
 *
 * Nima uchun: chat foydali, lekin faqat SO'RAGANDA. Do'kon egasi esa ko'pincha
 * nima so'rashni bilmaydi yoki vaqti yo'q. Bu karta savolsiz keladi: ilova
 * ochilganda eng muhim o'zgarish ko'rinadi.
 *
 * Xato yoki bo'sh javobda karta UMUMAN ko'rinmaydi — Bosh ekran asosiy ish
 * ekrani, unda ishlamayotgan element turishi kerak emas.
 */
export function AiInsightCard({ shopId, enabled }: { shopId?: string; enabled: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAiInsight(shopId, enabled);

  if (!enabled || isError) return null;
  if (!isLoading && !data) return null;

  return (
    <PressableScale
      onPress={() => router.push("/ai-chat")}
      accessibilityRole="button"
      accessibilityLabel={t("ai.insightTitle")}
      style={{
        flexDirection: "row",
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.primaryTint,
      }}
    >
      <Ionicons name="sparkles" size={text.lg} color={colors.primary} />

      <View className="flex-1">
        <Text style={{ fontSize: text.xs, fontWeight: "600", color: colors.primary }}>
          {t("ai.insightTitle")}
        </Text>

        {isLoading ? (
          <View className="mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ fontSize: text.sm, color: colors.muted }}>{t("ai.thinking")}</Text>
          </View>
        ) : (
          <Text style={{ marginTop: 4, fontSize: text.sm, lineHeight: 20, color: colors.ink }}>
            {data}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={text.base} color={colors.primary} />
    </PressableScale>
  );
}

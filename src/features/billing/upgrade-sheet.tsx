import { View, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius } from "@/theme/tokens";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { PlanLimitKey } from "./parse-plan-error";

/**
 * Limitga yetganda chiqadigan varaq — AI `quota_exceeded` xabari naqshiga
 * mos (`features/ai/message-bubble.tsx`), lekin bu yerda tugma bor:
 * "Tarifni ko'rish" foydalanuvchini `/subscription`ga olib boradi.
 */
export function UpgradeSheet({
  visible,
  onClose,
  limitKey,
  limit,
}: {
  visible: boolean;
  onClose: () => void;
  limitKey: PlanLimitKey | null;
  /** Joriy tarif chegarasi — xabar matnida ko'rsatiladi ("100 tagacha"). */
  limit?: number;
}) {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();

  const titleKey = limitKey
    ? `billing.limitReached.${limitKey}Title`
    : "billing.limitReached.genericTitle";
  const bodyKey = limitKey
    ? `billing.limitReached.${limitKey}Body`
    : "billing.limitReached.genericBody";

  function onViewPlans() {
    onClose();
    router.navigate("/subscription" as Href);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} contentStyle={{ alignItems: "center", gap: 14 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          backgroundColor: colors.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="rocket-outline" size={28} color={colors.primary} />
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <Text className="text-center text-lg font-medium text-ink">{t(titleKey)}</Text>
        <Text className="text-center text-sm text-muted">{t(bodyKey, { limit })}</Text>
      </View>

      <View className="w-full" style={{ gap: 10 }}>
        <Button label={t("billing.viewPlans")} onPress={onViewPlans} />
        <Button variant="ghost" label={t("common.close")} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

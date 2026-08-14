import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";
import { Button } from "@/components/ui/button";

/** Onboarding 3-qadam — muvaffaqiyat + trial haqida bir og'iz xabar. */
export default function OnboardingDoneScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  const setCompleting = useOnboardingStore((s) => s.setCompleting);

  // Bayroqni tushirib, o'zimiz o'tkazamiz — shundan keyin AuthGate yana
  // odatdagidek ishlaydi (do'kon bor → (tabs), qayta yo'naltirish yo'q).
  function onStart() {
    setCompleting(false);
    router.replace("/(tabs)");
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      footer={<Button label={t("onboarding.startBtn")} onPress={onStart} />}
    >
      <View className="items-center" style={{ gap: 16 }}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.successTint }}
        >
          <Ionicons name="checkmark-circle" size={44} color={colors.success} />
        </View>
        <View className="items-center" style={{ gap: 6 }}>
          <Text className="text-center text-2xl font-medium text-ink">{t("onboarding.doneTitle")}</Text>
          <Text className="text-center text-sm text-muted">{t("onboarding.doneSubtitle")}</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

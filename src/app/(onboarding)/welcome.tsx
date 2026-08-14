import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { IconChip } from "@/components/ui/icon-chip";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const VALUES: { icon: "storefront-outline" | "flash-outline" | "camera-outline" | "trending-up-outline"; key: string }[] = [
  { icon: "storefront-outline", key: "onboarding.valueManage" },
  { icon: "flash-outline", key: "onboarding.valueQuick" },
  { icon: "camera-outline", key: "onboarding.valueScan" },
  { icon: "trending-up-outline", key: "onboarding.valueSpeed" },
];

/**
 * Onboarding 1-qadam — "USCAN nima" 10-20 soniyada tushuniladigan darajada
 * qisqa (4 ta bullet, uzun matn yo'q). Ikki yo'l: do'kon ochish (egasi) yoki
 * xodim sifatida qo'shilish (egasi taklif qilishini kutish).
 */
export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      footer={
        <>
          <Button label={t("onboarding.openShop")} onPress={() => router.push("/(onboarding)/shop")} />
          <Button
            variant="ghost"
            label={t("onboarding.joinAsStaff")}
            onPress={() => router.push("/(onboarding)/waiting")}
          />
        </>
      }
    >
      <View className="items-center" style={{ gap: 22 }}>
        <Logo size={30} />
        <View className="items-center" style={{ gap: 6 }}>
          <Text className="text-center text-2xl font-medium text-ink">
            {t("onboarding.welcomeTitle")}
          </Text>
          <Text className="text-center text-sm text-muted">{t("onboarding.welcomeSubtitle")}</Text>
        </View>

        <View className="w-full" style={{ gap: 14 }}>
          {VALUES.map((v) => (
            <View key={v.key} className="flex-row items-center gap-3">
              <IconChip icon={v.icon} size="sm" />
              <Text className="flex-1 text-sm text-ink">{t(v.key)}</Text>
            </View>
          ))}
        </View>
      </View>
    </OnboardingShell>
  );
}

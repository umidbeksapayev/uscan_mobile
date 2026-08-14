import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/theme/theme-store";
import { radius, space } from "@/theme/tokens";

/**
 * Onboarding qadamlari uchun umumiy qobiq — yuqorida progress nuqtalari,
 * o'rtada markazlashtirilgan mazmun, pastda bitta katta amal tugmasi (bir
 * qo'l bilan foydalanish qulayligi uchun — CTA har doim ergashimli joyda).
 */
export function OnboardingShell({
  step,
  totalSteps,
  children,
  footer,
}: {
  /** 1-asosli joriy qadam. */
  step: number;
  totalSteps: number;
  children: ReactNode;
  footer: ReactNode;
}) {
  const colors = useColors();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 16 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={{
              width: i === step - 1 ? 22 : 8,
              height: 8,
              borderRadius: radius.full,
              backgroundColor: i <= step - 1 ? colors.primary : colors.line,
            }}
          />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>{children}</View>

      <View style={{ paddingHorizontal: 24, paddingBottom: space.lg, gap: 10 }}>{footer}</View>
    </SafeAreaView>
  );
}

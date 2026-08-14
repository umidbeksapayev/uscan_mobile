import { Stack } from "expo-router";

/**
 * Onboarding qadamlari orasida orqaga (gesture/tugma) qaytib bo'lmaydi —
 * yarim to'ldirilgan holatda "orqaga" bosish chalkashlik tug'diradi va
 * baribir DB'ga hech narsa yozilmagunicha hech qanday holat yo'qolmaydi
 * (`complete_onboarding()` atomar — ko'r. 040_onboarding.sql).
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}

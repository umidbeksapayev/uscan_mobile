import { View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/features/notifications/notify";
import { useAuth } from "@/features/auth/auth-context";
import { useMemberships } from "@/features/auth/use-memberships";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";

/**
 * Kassir yo'li — do'kon egasi foydalanuvchini o'z do'koniga qo'shishini
 * kutish (`add_shop_member`, staff.tsx). Bu ekranda do'kon YARATILMAYDI —
 * `handle_new_user()` shartli bo'lgani uchun (040_onboarding.sql) bu
 * userga hech qanday soxta do'kon tegmaydi.
 *
 * A'zolik paydo bo'lganini AuthGate o'zi payqaydi (memberships query
 * qayta yuklansa) — bu ekran faqat "Tekshirish" bilan qo'lda refetch
 * qiladi (push-invalidatsiya yo'q, real-time obuna kerak emas: bu bir
 * martalik kutish, doimiy polling ortiqcha).
 */
export default function OnboardingWaitingScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { refetch, isRefetching } = useMemberships();

  function onLogout() {
    Alert.alert(t("nav.logout"), t("menu.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nav.logout"),
        style: "destructive",
        // Tokenni AVVAL o'chiramiz — signOut'dan keyin RLS `auth.uid()` yo'q
        // bo'ladi va qator o'chmay qolardi (koproq.tsx dagi bilan bir xil).
        onPress: async () => {
          await unregisterPushToken();
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      footer={
        <>
          <Button
            label={t("onboarding.checkAgain")}
            onPress={() => void refetch()}
            loading={isRefetching}
          />
          <Button variant="ghost" label={t("nav.logout")} onPress={onLogout} />
        </>
      }
    >
      <View className="items-center" style={{ gap: 16 }}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primaryTint }}
        >
          <Ionicons name="hourglass-outline" size={36} color={colors.primary} />
        </View>
        <View className="items-center" style={{ gap: 6 }}>
          <Text className="text-center text-2xl font-medium text-ink">{t("onboarding.waitingTitle")}</Text>
          <Text className="text-center text-sm text-muted">
            {t("onboarding.waitingSubtitle", { email: session?.user.email ?? "" })}
          </Text>
        </View>
        <Text className="text-center text-xs text-muted">{t("onboarding.waitingHint")}</Text>
      </View>
    </OnboardingShell>
  );
}

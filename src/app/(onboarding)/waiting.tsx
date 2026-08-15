import { View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/features/notifications/notify";
import { useAuth } from "@/features/auth/auth-context";
import { useMyInvites, useRespondInvite } from "@/features/auth/use-invites";
import { InviteCard } from "@/features/auth/invite-card";
import { inviteErrorMessage } from "@/features/auth/invite-errors";
import { parsePlanLimitError } from "@/features/billing/parse-plan-error";
import { toast } from "@/lib/toast";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import type { MyInviteRow } from "@/types/database";

/**
 * Kassir yo'li — do'kon egasining taklifini kutish.
 *
 * Ilgari: egasi `add_shop_member` bilan darhol biriktirar edi (faqat email
 * `auth.users`da BOR bo'lsagina ishlardi — tartib muhim edi), bu ekran esa
 * ko'r taxmin bilan "Tekshirish" tugmasi orqali `memberships`ni qayta
 * so'rardi. Endi haqiqiy taklif (`shop_invites`, 044-migratsiya): egasi
 * istalgan vaqt taklif yozadi (kassir ro'yxatdan o'tmagan bo'lsa ham),
 * kassir esa BU YERDA aniq ko'radi va ANIQ qabul/rad qiladi — bir tomonlama
 * biriktirish emas.
 *
 * Taklif yo'q holatda eski "kutilmoqda" ko'rinishi qoladi (hali hech kim
 * taklif yubormagan bo'lishi mumkin) — qo'lda "Tekshirish" bilan yangilanadi
 * (push-invalidatsiya yo'q, doimiy polling ortiqcha: bu bir martalik kutish).
 */
export default function OnboardingWaitingScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: invites, refetch, isRefetching } = useMyInvites();
  const respondMut = useRespondInvite();

  const pendingInvites = invites ?? [];

  function onRespond(invite: MyInviteRow, accept: boolean) {
    respondMut.mutate(
      { inviteId: invite.id, accept },
      {
        onSuccess: (result) => {
          if (result.accepted) {
            toast.success(t("onboarding.inviteAccepted", { shop: invite.shop_name }));
          }
        },
        onError: (err) => {
          const message = (err as Error)?.message;
          const planErr = parsePlanLimitError(message);
          if (planErr) {
            toast.error(t("onboarding.inviteLimitTitle"), t("onboarding.inviteLimitHint"));
            return;
          }
          toast.error(t("onboarding.inviteRespondError"), inviteErrorMessage(message));
        },
      },
    );
  }

  function onDecline(invite: MyInviteRow) {
    Alert.alert(t("onboarding.declineTitle"), t("onboarding.declineConfirm", { shop: invite.shop_name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("onboarding.declineBtn"), style: "destructive", onPress: () => onRespond(invite, false) },
    ]);
  }

  function onLogout() {
    Alert.alert(t("nav.logout"), t("menu.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nav.logout"),
        style: "destructive",
        // Tokenni AVVAL o'chiramiz — signOut'dan keyin RLS `auth.uid()` yo'q
        // bo'ladi va qator o'chmay qolardi (koproq.tsx dagi bilan bir xil,
        // shu jumladan `scope: "local"` — sekin tarmoqda osilib qolmasin).
        onPress: async () => {
          await unregisterPushToken();
          await supabase.auth.signOut({ scope: "local" });
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
          {pendingInvites.length === 0 && (
            <Button
              label={t("onboarding.checkAgain")}
              onPress={() => void refetch()}
              loading={isRefetching}
            />
          )}
          <Button variant="ghost" label={t("nav.logout")} onPress={onLogout} />
        </>
      }
    >
      {pendingInvites.length > 0 ? (
        <View style={{ gap: 14, width: "100%" }}>
          <View className="items-center" style={{ gap: 6, marginBottom: 4 }}>
            <Text className="text-center text-2xl font-medium text-ink">
              {t("onboarding.invitesTitle")}
            </Text>
            <Text className="text-center text-sm text-muted">{t("onboarding.invitesSubtitle")}</Text>
          </View>
          {pendingInvites.map((inv) => (
            <InviteCard
              key={inv.id}
              invite={inv}
              busy={respondMut.isPending && respondMut.variables?.inviteId === inv.id}
              onAccept={() => onRespond(inv, true)}
              onDecline={() => onDecline(inv)}
            />
          ))}
        </View>
      ) : (
        <View className="items-center" style={{ gap: 16 }}>
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.primaryTint }}
          >
            <Ionicons name="hourglass-outline" size={36} color={colors.primary} />
          </View>
          <View className="items-center" style={{ gap: 6 }}>
            <Text className="text-center text-2xl font-medium text-ink">
              {t("onboarding.waitingTitle")}
            </Text>
            <Text className="text-center text-sm text-muted">
              {t("onboarding.waitingSubtitle", { email: session?.user.email ?? "" })}
            </Text>
          </View>
          <Text className="text-center text-xs text-muted">{t("onboarding.waitingHint")}</Text>
        </View>
      )}
    </OnboardingShell>
  );
}

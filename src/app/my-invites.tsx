import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { toast } from "@/lib/toast";
import { useMyInvites, useRespondInvite } from "@/features/auth/use-invites";
import { InviteCard } from "@/features/auth/invite-card";
import { inviteErrorMessage } from "@/features/auth/invite-errors";
import { parsePlanLimitError } from "@/features/billing/parse-plan-error";
import { ScreenHeader } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import type { MyInviteRow } from "@/types/database";

/**
 * Menga kelgan takliflar — bildirishnomalar markazidan ("Takliflar" alerti)
 * ochiladi. `(onboarding)/waiting.tsx` bilan farqi: bu ekran do'koni ALLAQACHON
 * bor foydalanuvchi uchun (masalan ega boshqa do'konga kassir sifatida
 * taklif qilingan) — onboarding guruhi faqat do'koni yo'qlarga ko'rinadi,
 * shuning uchun taklif shu yerda ko'rsatilmasa hech qachon ko'rinmay qolardi.
 */
export default function MyInvitesScreen() {
  const { t } = useTranslation();
  const { data: invites, isLoading } = useMyInvites();
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

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("myInvites.title")} />

      {!isLoading && pendingInvites.length === 0 ? (
        <EmptyState icon="mail-open-outline" text={t("myInvites.empty")} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          <Text className="text-sm text-muted">{t("onboarding.invitesSubtitle")}</Text>
          <View style={{ gap: 12 }}>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

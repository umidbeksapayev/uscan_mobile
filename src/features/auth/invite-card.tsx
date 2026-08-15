import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import type { MyInviteRow } from "@/types/database";

/**
 * Bitta kelgan taklif kartasi — do'kon nomi + rol + qabul/rad tugmasi.
 *
 * Ikki joyda ishlatiladi: onboarding "kutish" ekrani (`(onboarding)/waiting.tsx`,
 * hali do'koni yo'q foydalanuvchi) va `/my-invites` (allaqachon do'koni bor
 * foydalanuvchi — masalan boshqa do'konga kassir sifatida taklif qilingan
 * ega). Ikkalasida ham bir xil ko'rinish, faqat qobiq (shell) farq qiladi.
 */
export function InviteCard({
  invite,
  onAccept,
  onDecline,
  busy,
}: {
  invite: MyInviteRow;
  onAccept: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Card elevated style={{ width: "100%", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconChip icon="storefront-outline" tone="brand" />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: text.base, fontWeight: "700", color: colors.ink }}
            numberOfLines={1}
          >
            {invite.shop_name}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
            {invite.role === "owner" ? t("staff.owner") : t("staff.cashier")}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={onDecline}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.declineBtn")}
          style={{
            flex: 1,
            height: 44,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.line,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.muted }}>
            {t("onboarding.declineBtn")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.acceptBtn")}
          style={{
            flex: 1,
            height: 44,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ fontSize: text.sm, fontWeight: "700", color: "#fff" }}>
              {t("onboarding.acceptBtn")}
            </Text>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

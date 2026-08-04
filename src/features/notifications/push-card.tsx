import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { enablePush, isPushRegistered, type PushFailure } from "./notify";

/** Sabab kodi → tarjima kaliti. */
const FAILURE_KEYS: Record<PushFailure, string> = {
  noModule: "notif.errNoModule",
  noProjectId: "notif.errNoProjectId",
  denied: "notif.errDenied",
  noSession: "notif.errNoSession",
  tokenFailed: "notif.errTokenFailed",
  saveFailed: "notif.errSaveFailed",
};

/**
 * Push bildirishnomani yoqish (P1, migration 032).
 *
 * `LocalReminderCard` bilan yonma-yon turadi va uni ALMASHTIRMAYDI: lokal
 * eslatma internetsiz ham ishlaydi, push esa serverdagi haqiqiy holatni
 * (qarzdorlar, muddati o'tganlar) yetkazadi.
 *
 * Vaqt tanlovi bu yerda yo'q — push do'konning `summary_time` sozlamasidan
 * foydalanadi (Telegram xulosasi bilan bir xil), ya'ni ega ikkita alohida
 * jadval boshqarmaydi.
 */
export function PushCard() {
  const colors = useColors();
  const { t } = useTranslation();
  const shopId = useActiveShopId();

  const [enabled, setEnabled] = useState(() => isPushRegistered());
  const [busy, setBusy] = useState(false);

  async function onEnable() {
    if (busy || enabled) return;
    setBusy(true);
    try {
      const res = await enablePush(shopId ?? null);
      if (res.ok) {
        setEnabled(true);
        toast.success(t("notif.pushEnabled"));
      } else {
        // Aniq sababni ko'rsatamiz — ilgari hamma holat "dev build kerak"
        // deb chiqib, haqiqiy sababni (masalan FCM sozlanmagani) yashirardi.
        // To'liq xato matni Diagnostika jurnalida.
        toast.error(t("notif.pushFailedTitle"), t(FAILURE_KEYS[res.reason]));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 }}>
          {t("notif.pushTitle")}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 }}>
          {/* Yoqilgandan keyin muhimi — QACHON kelishi, ya'ni jadval qayerda. */}
          {enabled ? t("notif.pushScheduleHint") : t("notif.pushHint")}
        </Text>
      </View>

      {enabled ? (
        <View className="flex-row items-center" style={{ gap: 5 }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.successInk }}>
            {t("notif.pushOn")}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onEnable}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("notif.pushEnable")}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: colors.primary,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>
              {t("notif.pushEnable")}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

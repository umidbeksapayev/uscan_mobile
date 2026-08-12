import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { createOwnerLinkUrl, updateSummaryTime } from "@/features/telegram/owner-telegram";
import { enablePush, isPushRegistered, type PushFailure } from "./notify";
import type { Shop, SummaryTime } from "@/types/database";

/**
 * Kunlik xulosa — bitta karta (vaqt + yetkazish kanallari).
 *
 * Ilgari bu bo'lim UCHTA alohida kartadan iborat edi: "Push bildirishnoma",
 * "Kunlik eslatma" va "Kunlik xulosa (Telegram)". Ularning ikkitasida alohida
 * vaqt tanlagich bor edi va TURLI vaqtlarni ko'rsatardi (09:00/21:00 — lokal
 * eslatma, 07:00/00:00 — server cron), holbuki foydalanuvchi uchun bu bitta
 * narsa: "kunlik xulosa qachon kelsin?".
 *
 * Endi vaqt BITTA joyda tanlanadi (`shops.summary_time` — uni ham push, ham
 * Telegram o'qiydi), pastda esa faqat qaysi kanal ulanganini ko'rsatamiz.
 *
 * ⚠️ Faqat EGA uchun: `get_push_summaries` (migration 032) xulosani do'kon
 * egasining tokenlariga yuboradi (`pt.user_id = sh.owner_id`), kassirga
 * hech qachon kelmaydi.
 */

/** Vaqtlar SERVER cron'idan (`ShopScan_1v/vercel.json`), lokal jadvaldan emas. */
const TIMES: {
  value: SummaryTime;
  labelKey: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "morning", labelKey: "notif.morning", time: "07:00", icon: "sunny-outline" },
  { value: "evening", labelKey: "notif.evening", time: "00:00", icon: "moon-outline" },
  { value: "off", labelKey: "notif.off", time: "—", icon: "notifications-off-outline" },
];

const FAILURE_KEYS: Record<PushFailure, string> = {
  noModule: "notif.errNoModule",
  noProjectId: "notif.errNoProjectId",
  denied: "notif.errDenied",
  noSession: "notif.errNoSession",
  tokenFailed: "notif.errTokenFailed",
  saveFailed: "notif.errSaveFailed",
};

export function DailySummaryCard({ shop }: { shop: Shop }) {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [time, setTime] = useState<SummaryTime>(shop.summary_time ?? "off");
  const [savingTime, setSavingTime] = useState(false);

  const [pushOn, setPushOn] = useState(() => isPushRegistered());
  const [pushBusy, setPushBusy] = useState(false);

  const tgConnected = shop.owner_telegram_chat_id != null;
  const [tgBusy, setTgBusy] = useState(false);

  async function onChooseTime(value: SummaryTime) {
    if (value === time || savingTime) return;
    const prev = time;
    setTime(value);
    setSavingTime(true);
    try {
      await updateSummaryTime(shop.id, value);
      qc.invalidateQueries({ queryKey: ["memberships"] });
    } catch (e) {
      setTime(prev);
      toast.error(t("settings.tgSaveFailed"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSavingTime(false);
    }
  }

  async function onEnablePush() {
    if (pushBusy || pushOn) return;
    setPushBusy(true);
    try {
      const res = await enablePush(shop.id);
      if (res.ok) {
        setPushOn(true);
        toast.success(t("notif.pushEnabled"));
      } else {
        // Aniq sabab — "dev build kerak" degan umumiy xabar o'rniga.
        toast.error(t("notif.pushFailedTitle"), t(FAILURE_KEYS[res.reason]));
      }
    } finally {
      setPushBusy(false);
    }
  }

  async function onConnectTelegram() {
    setTgBusy(true);
    try {
      const url = await createOwnerLinkUrl(shop.id);
      await Linking.openURL(url);
      toast.info(t("settings.tgOpenedTitle"), t("settings.tgOpenedBody"));
    } catch (e) {
      toast.error(
        t("settings.tgConnectFailed"),
        e instanceof Error ? e.message : t("settings.tgLinkFailed"),
      );
    } finally {
      setTgBusy(false);
    }
  }

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      {/* Sarlavha */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
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
            {t("notif.summaryTitle", "Kunlik xulosa")}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 }}>
            {t("notif.summaryHint", "Savdo va qarz yakuni belgilangan vaqtda yuboriladi")}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.line }} />

      {/* Vaqt */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 0.4 }}>
          {t("settings.summaryTimeLabel").toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, padding: 12, backgroundColor: colors.bg }}>
        {TIMES.map((opt) => {
          const active = time === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChooseTime(opt.value)}
              disabled={savingTime}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: savingTime }}
              accessibilityLabel={`${t(opt.labelKey)} ${opt.time}`}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 12,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.line,
                opacity: savingTime ? 0.6 : 1,
              }}
            >
              <Ionicons name={opt.icon} size={14} color={active ? "#fff" : colors.muted} />
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : colors.ink,
                    lineHeight: 16,
                  }}
                >
                  {opt.time}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: active ? "rgba(255,255,255,0.75)" : colors.muted,
                    lineHeight: 13,
                  }}
                >
                  {t(opt.labelKey)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Kanallar — vaqt "o'chiq" bo'lsa hech narsa yuborilmaydi, shuni aytamiz */}
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 0.4 }}>
          {t("notif.channels", "Yetkazish kanallari").toUpperCase()}
        </Text>
      </View>

      <View style={{ padding: 12, gap: 8, opacity: time === "off" ? 0.5 : 1 }}>
        <ChannelRow
          icon="phone-portrait-outline"
          label={t("notif.channelPush", "Telefon bildirishnomasi")}
          connected={pushOn}
          connectedLabel={t("notif.pushOn")}
          actionLabel={t("notif.pushEnable")}
          busy={pushBusy}
          onPress={onEnablePush}
        />
        <ChannelRow
          icon="paper-plane-outline"
          label={t("notif.channelTelegram", "Telegram")}
          connected={tgConnected}
          connectedLabel={t("settings.tgConnectedShort")}
          actionLabel={t("settings.tgConnectBtn")}
          busy={tgBusy}
          onPress={onConnectTelegram}
        />
      </View>

      {/*
        Telegram botda «Start» bosilgach `owner_telegram_chat_id` serverda
        paydo bo'ladi, lekin ilovadagi kesh eskiligicha qoladi — shuning uchun
        qo'lda yangilash kerak (avvalgi kartada ham shu tugma bor edi).
      */}
      {!tgConnected ? (
        <Pressable
          onPress={() => qc.invalidateQueries({ queryKey: ["memberships"] })}
          hitSlop={8}
          accessibilityRole="button"
          style={{ paddingHorizontal: 12, paddingBottom: 12 }}
        >
          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 15 }}>
            {t("settings.tgRefreshHint")}
          </Text>
        </Pressable>
      ) : null}

      {time === "off" ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 15 }}>
            {t("notif.summaryOffHint", "Vaqt tanlanmagan — xulosa yuborilmaydi.")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Bitta kanal qatori: ulangan bo'lsa holat, aks holda ulash tugmasi. */
function ChannelRow({
  icon,
  label,
  connected,
  connectedLabel,
  actionLabel,
  busy,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  connected: boolean;
  connectedLabel: string;
  actionLabel: string;
  busy: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.ink }}>{label}</Text>

      {connected ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.successInk }}>
            {connectedLabel}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onPress}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${actionLabel}`}
          style={{
            minHeight: 36,
            paddingHorizontal: 14,
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: colors.primary,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>{actionLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

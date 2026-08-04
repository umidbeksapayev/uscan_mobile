import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { createOwnerLinkUrl, updateSummaryTime } from "./owner-telegram";
import type { Shop, SummaryTime } from "@/types/database";

/** Yorliq matni tarjima kaliti sifatida saqlanadi — til almashganda yangilanadi. */
const TIMES: {
  value: SummaryTime;
  labelKey: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  // ⚠️ Vaqtlar SERVER cron'idan kelib chiqadi (`ShopScan_1v/vercel.json`), lokal
  // eslatma jadvalidan EMAS:
  //   morning → "0 2 * * *"  UTC = 07:00 Toshkent
  //   evening → "0 19 * * *" UTC = 00:00 Toshkent (kun boshi)
  // Cron jadvali o'zgarsa shu yorliqlar ham yangilanishi kerak.
  { value: "morning", labelKey: "notif.morning", time: "07:00", icon: "sunny-outline" },
  { value: "evening", labelKey: "notif.evening", time: "00:00", icon: "moon-outline" },
  { value: "off", labelKey: "notif.off", time: "—", icon: "notifications-off-outline" },
];

export function TelegramSummaryCard({ shop }: { shop: Shop }) {
  const colors = useColors();
  const { t } = useTranslation();

  const qc = useQueryClient();
  const connected = shop.owner_telegram_chat_id != null;
  const [time, setTime] = useState<SummaryTime>(shop.summary_time ?? "off");
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onConnect() {
    setConnecting(true);
    try {
      const url = await createOwnerLinkUrl(shop.id);
      await Linking.openURL(url);
      toast.info(t("settings.tgOpenedTitle"), t("settings.tgOpenedBody"));
    } catch (e) {
      toast.error(t("settings.tgConnectFailed"), e instanceof Error ? e.message : t("settings.tgLinkFailed"));
    } finally {
      setConnecting(false);
    }
  }

  function onRefresh() {
    qc.invalidateQueries({ queryKey: ["memberships"] });
  }

  async function onChooseTime(value: SummaryTime) {
    if (value === time) return;
    const prev = time;
    setTime(value);
    setSaving(true);
    try {
      await updateSummaryTime(shop.id, value);
      qc.invalidateQueries({ queryKey: ["memberships"] });
    } catch (e) {
      setTime(prev);
      toast.error(t("settings.tgSaveFailed"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
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
            backgroundColor: "rgba(3,169,244,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#0288d1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 }}>
            Kunlik xulosa (Telegram)
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 }}>
            Savdo natijasi Telegram'ga yuboriladi
          </Text>
        </View>
        {/* Holat badge — yashil nuqta bilan */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: connected ? "rgba(22,163,74,0.1)" : colors.bg,
            borderWidth: 1,
            borderColor: connected ? "rgba(22,163,74,0.2)" : colors.line,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: connected ? colors.success : colors.tabInactive,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: connected ? colors.successInk : colors.muted,
            }}
          >
            {connected ? t("settings.tgConnectedShort") : t("settings.tgNotConnectedShort")}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.line }} />

      {/* Ulash — faqat ulanmagan bo'lsa */}
      {!connected ? (
        <View style={{ padding: 12, gap: 8, backgroundColor: colors.bg }}>
          <Pressable
            onPress={onConnect}
            disabled={connecting}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 46,
              borderRadius: 14,
              backgroundColor: colors.primary,
              opacity: connecting ? 0.6 : 1,
            }}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={17} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                  {t("settings.tgConnectBtn")}
                </Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={onRefresh} style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t("settings.tgRefreshHint")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Divider — ulash bloki bilan jadval orasida */}
      {!connected ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}

      {/*
        Kunlik xulosa vaqti — Telegram ulanishidan MUSTAQIL.
        ⚠️ Bu `shops.summary_time` maydonini yozadi va uni HAM Telegram, HAM
        push kanali o'qiydi (migration 032 `get_push_summaries`). Ilgari bu
        tanlagich `connected` sharti ichida edi — natijada Telegramni ulamagan
        ega jadval belgilay olmasdi va push hech qachon yuborilmasdi.
      */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>
          {t("settings.summaryTimeLabel")}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 12,
          backgroundColor: colors.bg,
        }}
      >
          {TIMES.map((opt) => {
            const activeOpt = time === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChooseTime(opt.value)}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ selected: activeOpt, disabled: saving }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  backgroundColor: activeOpt ? colors.primary : colors.surface,
                  borderWidth: 1.5,
                  borderColor: activeOpt ? colors.primary : colors.line,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={activeOpt ? "#fff" : colors.muted}
                />
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: activeOpt ? "#fff" : colors.ink,
                      lineHeight: 16,
                    }}
                  >
                    {opt.time}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: activeOpt ? "rgba(255,255,255,0.75)" : colors.muted,
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
    </View>
  );
}

import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { createOwnerLinkUrl, updateSummaryTime } from "./owner-telegram";
import type { Shop, SummaryTime } from "@/types/database";

const TIMES: {
  value: SummaryTime;
  label: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "morning", label: "Ertalab", time: "07:00", icon: "sunny-outline" },
  { value: "evening", label: "Kechqurun", time: "21:00", icon: "moon-outline" },
  { value: "off", label: "O'chiq", time: "—", icon: "notifications-off-outline" },
];

export function TelegramSummaryCard({ shop }: { shop: Shop }) {
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
      toast.info("Telegram ochildi", "Botda «Start» bosing, so'ng bu yerga qayting.");
    } catch (e) {
      toast.error("Ulanmadi", e instanceof Error ? e.message : "Havola olinmadi");
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
      toast.error("Saqlanmadi", e instanceof Error ? e.message : "Xatolik");
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
              backgroundColor: connected ? "#16A34A" : colors.tabInactive,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: connected ? "#15803d" : colors.muted,
            }}
          >
            {connected ? "Ulangan" : "Ulanmagan"}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.line }} />

      {/* Qism: ulash yoki vaqt tanlash */}
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
                  Telegram'ga ulash
                </Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={onRefresh} style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Botda «Start» bosdingizmi? → Holatni yangilash
            </Text>
          </Pressable>
        </View>
      ) : (
        /* Chip tugmalar — gorizontal */
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            padding: 12,
            backgroundColor: colors.bg,
          }}
        >
          {TIMES.map((t) => {
            const activeOpt = time === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => onChooseTime(t.value)}
                disabled={saving}
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
                  name={t.icon}
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
                    {t.time}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: activeOpt ? "rgba(255,255,255,0.75)" : colors.muted,
                      lineHeight: 13,
                    }}
                  >
                    {t.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

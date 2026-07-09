import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { createOwnerLinkUrl, updateSummaryTime } from "./owner-telegram";
import type { Shop, SummaryTime } from "@/types/database";

const TIMES: { value: SummaryTime; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "Ertalab", sub: "07:00", icon: "sunny-outline" },
  { value: "evening", label: "Kechqurun", sub: "21:00", icon: "moon-outline" },
  { value: "off", label: "O'chiq", sub: "—", icon: "notifications-off-outline" },
];

/**
 * Egaga kunlik Telegram xulosa: botga ulash (deep-link) + vaqt tanlovi.
 */
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
    <View className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* Sarlavha */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(3,169,244,0.12)" }}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#0288d1" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">Kunlik xulosa (Telegram)</Text>
          <Text className="text-xs text-muted mt-0.5">Savdo natijasi Telegram'ga yuboriladi</Text>
        </View>
        {/* Holat badge */}
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: connected ? "#E7F6EE" : "#f3f4f6" }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: connected ? "#0F6E56" : colors.muted,
            }}
          >
            {connected ? "Ulangan" : "Ulanmagan"}
          </Text>
        </View>
      </View>

      {/* Qism: ulash tugmasi yoki vaqt tanlovi */}
      {!connected ? (
        <View className="border-t border-line px-4 py-3" style={{ gap: 8 }}>
          <Pressable
            onPress={onConnect}
            disabled={connecting}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-primary"
            style={{ height: 46, opacity: connecting ? 0.6 : 1 }}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={17} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
                  Telegram'ga ulash
                </Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={onRefresh} className="items-center py-1">
            <Text className="text-xs text-muted">
              Botda «Start» bosdingizmi? → Holatni yangilash
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row border-t border-line">
          {TIMES.map((t, i) => {
            const activeOpt = time === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => onChooseTime(t.value)}
                disabled={saving}
                className="flex-1 items-center justify-center py-3"
                style={{
                  backgroundColor: activeOpt ? colors.primary : "transparent",
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: colors.line,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Ionicons name={t.icon} size={17} color={activeOpt ? "#fff" : colors.muted} />
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 3,
                    fontWeight: "600",
                    color: activeOpt ? "#fff" : colors.ink,
                  }}
                >
                  {t.sub}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    marginTop: 1,
                    color: activeOpt ? "rgba(255,255,255,0.8)" : colors.muted,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

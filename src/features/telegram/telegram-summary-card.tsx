import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { createOwnerLinkUrl, updateSummaryTime } from "./owner-telegram";
import type { Shop, SummaryTime } from "@/types/database";

const TIMES: { value: SummaryTime; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "Ertalab", icon: "sunny-outline" },
  { value: "evening", label: "Kechqurun", icon: "moon-outline" },
  { value: "off", label: "O'chiq", icon: "notifications-off-outline" },
];

/**
 * Egaga kunlik Telegram xulosa: botga ulash (deep-link) + vaqt tanlovi.
 * Web settings/owner-telegram-card.tsx ga mos — xabarni web backend cron
 * yuboradi (migration 027), mobile faqat ulash/sozlash UI.
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

  /** Botda /start bosilgach DB yangilanadi — holatni qayta o'qish. */
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
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 12 }}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-ink">Kunlik xulosa (Telegram)</Text>
          <Text className="text-xs text-muted">
            Har kuni savdo natijasi Telegram'ga yuboriladi
          </Text>
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: connected ? "#E7F6EE" : colors.bg }}
        >
          <Text
            style={{ fontSize: 11, fontWeight: "500", color: connected ? "#0F6E56" : colors.muted }}
          >
            {connected ? "Ulangan" : "Ulanmagan"}
          </Text>
        </View>
      </View>

      {!connected ? (
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={onConnect}
            disabled={connecting}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
            style={{ height: 48, opacity: connecting ? 0.6 : 1 }}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text className="text-base font-medium text-white">Telegram'ga ulash</Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={onRefresh} className="items-center p-1">
            <Text className="text-xs text-muted">Botda «Start» bosdingizmi? Holatni yangilash</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row gap-2">
          {TIMES.map((t) => {
            const activeOpt = time === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => onChooseTime(t.value)}
                disabled={saving}
                className="flex-1 items-center justify-center rounded-xl"
                style={{
                  height: 52,
                  backgroundColor: activeOpt ? colors.primary : colors.bg,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Ionicons name={t.icon} size={16} color={activeOpt ? "#fff" : colors.muted} />
                <Text
                  style={{
                    fontSize: 11,
                    marginTop: 2,
                    fontWeight: "500",
                    color: activeOpt ? "#fff" : colors.muted,
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

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { setDailySummaryReminder, getDailySlot } from "./notify";
import type { ReminderSlot } from "./notify-math";

const OPTIONS: { value: ReminderSlot; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "Ertalab", sub: "09:00", icon: "sunny-outline" },
  { value: "evening", label: "Kechqurun", sub: "21:00", icon: "moon-outline" },
  { value: "off", label: "O'chiq", sub: "—", icon: "notifications-off-outline" },
];

/**
 * Telefonda lokal kunlik eslatma (server/Telegram'siz — barcha foydalanuvchiga).
 * Kam-qoldiq eslatmasi ham shu ruxsatga suyanadi (dashboardда jim rejalashadi).
 */
export function LocalReminderCard() {
  const [slot, setSlot] = useState<ReminderSlot>(getDailySlot());
  const [saving, setSaving] = useState(false);

  async function onChoose(value: ReminderSlot) {
    if (value === slot || saving) return;
    const prev = slot;
    setSlot(value);
    setSaving(true);
    try {
      const ok = await setDailySummaryReminder(value);
      if (!ok) {
        setSlot(prev);
        toast.error(
          "Yoqib bo'lmadi",
          "Bildirishnoma ruxsati berilmadi yoki bu build'da modul yo'q (yangi build kerak).",
        );
      }
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
          style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
        >
          <Ionicons name="alarm-outline" size={20} color="#2563eb" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">Kunlik eslatma</Text>
          <Text className="text-xs text-muted mt-0.5">Telefonda savdo yakunini eslatadi</Text>
        </View>
      </View>

      {/* Vaqt tugmalari */}
      <View className="flex-row border-t border-line">
        {OPTIONS.map((o, i) => {
          const active = slot === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChoose(o.value)}
              disabled={saving}
              className="flex-1 items-center justify-center py-3"
              style={{
                backgroundColor: active ? colors.primary : "transparent",
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: colors.line,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Ionicons
                name={o.icon}
                size={17}
                color={active ? "#fff" : colors.muted}
              />
              <Text
                style={{
                  fontSize: 12,
                  marginTop: 3,
                  fontWeight: "600",
                  color: active ? "#fff" : colors.ink,
                }}
              >
                {o.sub}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  marginTop: 1,
                  color: active ? "rgba(255,255,255,0.8)" : colors.muted,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

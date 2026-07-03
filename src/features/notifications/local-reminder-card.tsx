import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { setDailySummaryReminder, getDailySlot } from "./notify";
import type { ReminderSlot } from "./notify-math";

const OPTIONS: { value: ReminderSlot; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "morning", label: "09:00", icon: "sunny-outline" },
  { value: "evening", label: "21:00", icon: "moon-outline" },
  { value: "off", label: "O'chiq", icon: "notifications-off-outline" },
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
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 12 }}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="alarm-outline" size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-ink">Kunlik eslatma (telefonda)</Text>
          <Text className="text-xs text-muted">
            Har kuni tanlangan vaqtda savdo yakunini eslatadi
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {OPTIONS.map((o) => {
          const active = slot === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChoose(o.value)}
              disabled={saving}
              className="flex-1 items-center justify-center rounded-xl"
              style={{
                height: 52,
                backgroundColor: active ? colors.primary : colors.bg,
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Ionicons name={o.icon} size={16} color={active ? "#fff" : colors.muted} />
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2,
                  fontWeight: "500",
                  color: active ? "#fff" : colors.muted,
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

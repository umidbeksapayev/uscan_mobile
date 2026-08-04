import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { setDailySummaryReminder, getDailySlot } from "./notify";
import type { ReminderSlot } from "./notify-math";

const OPTIONS: {
  value: ReminderSlot;
  label: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "morning", label: "Ertalab", time: "09:00", icon: "sunny-outline" },
  { value: "evening", label: "Kechqurun", time: "21:00", icon: "moon-outline" },
  { value: "off", label: "O'chiq", time: "—", icon: "notifications-off-outline" },
];

export function LocalReminderCard() {
  const colors = useColors();

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
        toast.error("Yoqib bo'lmadi", "Bildirishnoma ruxsati berilmadi.");
      }
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
            backgroundColor: "rgba(245,158,11,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="alarm-outline" size={20} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 }}>
            Kunlik eslatma
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 }}>
            Savdo yakunini belgilangan vaqtda eslatadi
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.line }} />

      {/* Chip tugmalar — gorizontal */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 12,
          backgroundColor: colors.bg,
        }}
      >
        {OPTIONS.map((o) => {
          const active = slot === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChoose(o.value)}
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
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.line,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Ionicons
                name={o.icon}
                size={14}
                color={active ? "#fff" : colors.muted}
              />
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : colors.ink,
                    lineHeight: 16,
                  }}
                >
                  {o.time}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: active ? "rgba(255,255,255,0.75)" : colors.muted,
                    lineHeight: 13,
                  }}
                >
                  {o.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

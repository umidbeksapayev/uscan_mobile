import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";

export type StatTone = "brand" | "green" | "amber" | "muted";

const TONE: Record<StatTone, { bg: string; fg: string }> = {
  brand: { bg: colors.primaryTint, fg: colors.primary },
  green: { bg: "#E7F6EE", fg: "#0F6E56" },
  amber: { bg: "#FCF1DD", fg: "#92600A" },
  muted: { bg: "#EEF2F7", fg: colors.muted },
};

export interface StatsCardProps {
  label: string;
  value?: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
  /** view_cost/view_reports yo'q — qiymat o'rniga "Faqat egasi ko'radi". */
  locked?: boolean;
  /** Oldingi davrga nisbatan foiz (↑/↓). null bo'lsa ko'rsatilmaydi. */
  delta?: number | null;
  loading?: boolean;
}

/** Statistika ko'rsatkichi uchun qayta ishlatiladigan karta. */
export function StatsCard({
  label,
  value,
  subtitle,
  icon,
  tone = "brand",
  locked,
  delta,
  loading,
}: StatsCardProps) {
  const c = TONE[tone];
  const up = (delta ?? 0) >= 0;

  return (
    <View
      className="flex-1 rounded-2xl bg-surface p-3.5"
      style={{
        borderWidth: 0.5,
        borderColor: colors.line,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg }}>
          <Ionicons name={locked ? "lock-closed" : icon} size={16} color={locked ? colors.muted : c.fg} />
        </View>
        {!locked && delta !== null && delta !== undefined ? (
          <View
            className="flex-row items-center rounded-full px-1.5 py-0.5"
            style={{ gap: 2, backgroundColor: up ? "#E7F6EE" : "#FDECEC" }}
          >
            <Ionicons name={up ? "arrow-up" : "arrow-down"} size={10} color={up ? "#0F6E56" : "#B42318"} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: up ? "#0F6E56" : "#B42318" }}>
              {`${Math.abs(delta).toFixed(0)}%`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-2 text-xs text-muted" numberOfLines={1}>
        {label}
      </Text>

      {loading ? (
        <View className="mt-1.5 h-6 rounded-md" style={{ width: "70%", backgroundColor: colors.line }} />
      ) : locked ? (
        <View className="mt-1 flex-row items-center" style={{ gap: 4 }}>
          <Ionicons name="lock-closed" size={13} color={colors.tabInactive} />
          <Text className="text-sm font-medium text-muted">Faqat egasi ko'radi</Text>
        </View>
      ) : (
        <>
          <Text className="mt-1 text-xl font-bold text-ink" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          {subtitle ? <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text> : null}
        </>
      )}
    </View>
  );
}

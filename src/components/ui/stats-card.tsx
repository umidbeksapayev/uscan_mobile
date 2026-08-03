import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors, useIsDark } from "@/theme/theme-store";
import type { AppColors } from "@/theme/colors";

export type StatTone = "brand" | "green" | "amber" | "muted";

/** Ohang (tone) ranglari — tungi rejimda fon to'qlashadi, matn yorishadi. */
function toneColors(
  colors: AppColors,
  isDark: boolean
): Record<StatTone, { bg: string; fg: string }> {
  return isDark
    ? {
        brand: { bg: colors.primaryTint, fg: colors.primary },
        green: { bg: "#0D2E23", fg: "#34D399" },
        amber: { bg: "#3B2A08", fg: "#FBBF24" },
        muted: { bg: "#334155", fg: colors.muted },
      }
    : {
        brand: { bg: colors.primaryTint, fg: colors.primary },
        green: { bg: "#E7F6EE", fg: "#0F6E56" },
        amber: { bg: "#FCF1DD", fg: "#92600A" },
        muted: { bg: "#EEF2F7", fg: colors.muted },
      };
}

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
  const colors = useColors();
  const isDark = useIsDark();
  const c = toneColors(colors, isDark)[tone];
  const up = (delta ?? 0) >= 0;
  // Delta belgisi (↑/↓) — tungi rejimda to'q fon + yorqin matn.
  const deltaBg = up ? (isDark ? "#0D2E23" : "#E7F6EE") : isDark ? "#3B1214" : "#FDECEC";
  const deltaFg = up ? (isDark ? "#34D399" : "#0F6E56") : isDark ? "#FCA5A5" : "#B42318";

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
            style={{ gap: 2, backgroundColor: deltaBg }}
          >
            <Ionicons name={up ? "arrow-up" : "arrow-down"} size={10} color={deltaFg} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: deltaFg }}>
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

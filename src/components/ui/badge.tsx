import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";
import { tabularNums } from "@/theme/typography";

export type BadgeTone = "brand" | "neutral" | "success" | "danger" | "warning";

/**
 * Nishon (pill) — kichik holat yorlig'i yoki sanoq.
 *
 * Radius har doim `full`: ilgari bu naqsh goh `20`, goh `999` bilan
 * yozilardi — ikkalasi ham amalda pill, lekin `20` balandligi 26px dan
 * oshgan nishonda to'satdan "yumaloq to'rtburchak"ka aylanardi.
 */
export function Badge({
  label,
  tone = "brand",
  icon,
  /** Sanoq (`3/6`) — bir xil kenglikdagi raqamlar bilan chiziladi. */
  numeric = false,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  numeric?: boolean;
}) {
  const colors = useColors();

  const tones: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
    brand: { bg: colors.primaryTint, fg: colors.primary, border: colors.primary },
    neutral: { bg: colors.neutralTint, fg: colors.muted, border: colors.line },
    success: { bg: colors.successTint, fg: colors.successInk, border: colors.successBorder },
    danger: { bg: colors.dangerTint, fg: colors.dangerInk, border: colors.dangerBorder },
    warning: { bg: colors.warningTint, fg: colors.warningInk, border: colors.warning },
  };
  const c = tones[tone];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.full,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={c.fg} /> : null}
      <Text
        style={{
          fontSize: text.micro,
          fontWeight: "700",
          color: c.fg,
          ...(numeric ? tabularNums : null),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

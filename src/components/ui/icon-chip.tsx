import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { radius } from "@/theme/tokens";

export type ChipTone = "brand" | "neutral" | "success" | "danger" | "warning";
export type ChipSize = "sm" | "md" | "lg";

const SIZES: Record<ChipSize, { box: number; icon: number; r: number }> = {
  sm: { box: 32, icon: 16, r: radius.md },
  md: { box: 40, icon: 19, r: radius.md },
  lg: { box: 52, icon: 26, r: radius.lg },
};

/**
 * Ikonka chipi — tint fonli kvadrat ichida ikonka.
 *
 * Sozlamalar, bildirishnoma kartalari, bo'sh holatlar — 21 joyda shu naqsh
 * bor edi, o'lchami esa 32/36/38/40/46/52/54 (yetti xil). Bu yerda uch
 * qadam: `sm` (ro'yxat qatori), `md` (sozlama qatori), `lg` (bo'sh holat).
 */
export function IconChip({
  icon,
  tone = "brand",
  size = "md",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: ChipTone;
  size?: ChipSize;
}) {
  const colors = useColors();
  const s = SIZES[size];

  const tones: Record<ChipTone, { bg: string; fg: string }> = {
    brand: { bg: colors.primaryTint, fg: colors.primary },
    neutral: { bg: colors.neutralTint, fg: colors.muted },
    success: { bg: colors.successTint, fg: colors.successInk },
    danger: { bg: colors.dangerTint, fg: colors.dangerInk },
    warning: { bg: colors.warningTint, fg: colors.warningInk },
  };
  const c = tones[tone];

  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.r,
        backgroundColor: c.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={s.icon} color={c.fg} />
    </View>
  );
}

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/theme/theme-store";
import { shadowSm } from "@/theme/shadows";
import { radius, space } from "@/theme/tokens";

export type CardTone = "default" | "danger" | "success" | "warning" | "brand";

/**
 * Karta qobig'i — `rounded-2xl` + chegara + `surface` foni.
 *
 * Bu naqsh 20 dan ortiq faylda qo'lda yozilgan edi, chegara qalinligi esa
 * ikki xil: 27 joyda `1`, 11 joyda `0.5` (dashboarddagi `Card`). Android'da
 * 0.5px chegara qurilmaga qarab goh ko'rinadi, goh yo'qoladi — shuning
 * uchun kanonik qiymat `1`.
 *
 * `tone` — semantik fon/chegara (xato banneri, ogohlantirish). Ranglar
 * palitradan olinadi, ya'ni tungi rejimda o'zi teskarilanadi.
 */
export function Card({
  children,
  tone = "default",
  padded = true,
  elevated = false,
  style,
}: {
  children: ReactNode;
  tone?: CardTone;
  /** `false` — ichki bo'sh joysiz (ro'yxat kartasi, qatorlar o'zi beradi). */
  padded?: boolean;
  /** Nozik soya — sahifa fonidan ajratish kerak bo'lganda. */
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  const tones: Record<CardTone, { bg: string; border: string }> = {
    default: { bg: colors.surface, border: colors.line },
    danger: { bg: colors.dangerTint, border: colors.dangerBorder },
    success: { bg: colors.successTint, border: colors.successBorder },
    warning: { bg: colors.warningTint, border: colors.warning },
    brand: { bg: colors.primaryTint, border: colors.primary },
  };
  const c = tones[tone];

  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bg,
          padding: padded ? space.lg : 0,
        },
        elevated ? shadowSm(colors.shadow) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

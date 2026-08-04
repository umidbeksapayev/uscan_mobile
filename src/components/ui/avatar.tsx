import { View, Text } from "react-native";

import { useColors } from "@/theme/theme-store";

/**
 * Bosh harfli doira (audit A6) — mijoz/ta'minotchi ro'yxatlarida 4 joyda
 * bir xil yozilgan edi (`name.slice(0, 1).toUpperCase()` + rangli doira).
 */
export function Avatar({
  name,
  size = 44,
  tone,
}: {
  name: string;
  /** Diametr (px). Ro'yxat kartalarida 44, sheet qatorlarida 36. */
  size?: number;
  /** Fon/matn rangi juftligi — berilmasa brend rangi. */
  tone?: { bg: string; text: string };
}) {
  const colors = useColors();
  const palette = tone ?? { bg: colors.primaryTint, text: colors.primary };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: "600", color: palette.text }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

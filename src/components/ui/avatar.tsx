import { View, Text } from "react-native";
import { Image } from "expo-image";

import { useColors } from "@/theme/theme-store";

/**
 * Bosh harfli doira (audit A6) — mijoz/ta'minotchi ro'yxatlarida 4 joyda
 * bir xil yozilgan edi (`name.slice(0, 1).toUpperCase()` + rangli doira).
 *
 * `uri` berilsa o'rniga rasm chiziladi (profil rasmi) — rasm yuklanmasa
 * `expo-image` pastdagi bosh harfni ko'rsatib turadi, ya'ni bo'sh doira
 * hech qachon chiqmaydi.
 */
export function Avatar({
  name,
  size = 44,
  tone,
  uri,
}: {
  name: string;
  /** Diametr (px). Ro'yxat kartalarida 44, sheet qatorlarida 36. */
  size?: number;
  /** Fon/matn rangi juftligi — berilmasa brend rangi. */
  tone?: { bg: string; text: string };
  /** Profil rasmi URL'i — bo'lmasa bosh harf ko'rinadi. */
  uri?: string | null;
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
        overflow: "hidden",
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: "600", color: palette.text }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={150}
          style={{ position: "absolute", width: size, height: size }}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

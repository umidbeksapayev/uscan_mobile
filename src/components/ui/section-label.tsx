import { View, Text } from "react-native";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";

/**
 * Bo'lim sarlavhasi — brend ko'kidagi qisqa chiziq + katta harfli yozuv.
 * Ekranni bo'limlarga ajratadi va "moviy" ohangni ushlab turadi.
 *
 * `settings.tsx` ichida yozilgan edi; profil ekrani ham xuddi shu naqshni
 * ishlatgani uchun umumiy komponentga chiqarildi (nusxa emas).
 */
export function SectionLabel({ label }: { label: string }) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginLeft: 4 }}>
      <View style={{ width: 3, height: 13, borderRadius: radius.full, backgroundColor: colors.primary }} />
      <Text
        accessibilityRole="header"
        style={{
          fontSize: text.xs,
          fontWeight: "700",
          color: colors.heading,
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

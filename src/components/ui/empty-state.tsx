import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";

/**
 * Bo'sh ro'yxat holati (audit A6) — katalog va tarix ekranlarida bir xil
 * komponent mustaqil ravishda ikki marta yozilgan edi (yagona farq —
 * tarixdagi `paddingTop`).
 */
export function EmptyState({
  icon,
  text,
  paddingTop,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  /** Ro'yxat sarlavhasi ostida markazlashtirish uchun (tarix ekrani: 80). */
  paddingTop?: number;
}) {
  const colors = useColors();

  return (
    <View className="flex-1 items-center justify-center px-10" style={{ paddingTop }}>
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text className="text-center text-base text-muted">{text}</Text>
    </View>
  );
}

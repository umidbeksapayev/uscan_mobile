import { memo, type ReactNode } from "react";
import { View, Text } from "react-native";

import { useColors } from "@/theme/theme-store";
import { SheetPressable } from "./bottom-sheet";

/**
 * BottomSheet ichidagi tanlov qatori (audit A6) — mijoz/ta'minotchi/mahsulot
 * tanlash oynalarida 3 joyda bir xil yozilgan edi.
 *
 * Karta emas, ajratuvchi chiziqli oddiy qator: sheet ichida karta ustiga
 * karta qo'yish vizual shovqin beradi.
 *
 * ⚠️ `SheetPressable` ishlatiladi (oddiy `Pressable` emas) — `@gorhom/bottom-sheet`
 * ichida jest ushlash uchun shu kerak.
 */
export const ListRow = memo(function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();

  return (
    <SheetPressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      className="flex-row items-center gap-3 py-2.5"
      style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}
    >
      {leading}
      <View className="min-w-0 flex-1">
        <Text className="text-base text-ink" numberOfLines={1}>
          {title}
        </Text>
        {typeof subtitle === "string" ? (
          <Text className="text-xs text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {trailing}
    </SheetPressable>
  );
});

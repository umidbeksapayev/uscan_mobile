import { memo, type ReactNode } from "react";
import { View, Text } from "react-native";

import { useColors } from "@/theme/theme-store";
import { radius } from "@/theme/tokens";
import { PressableScale } from "@/components/ui/pressable-scale";

/**
 * Ro'yxat kartasi (audit A6) — "doira/ikonka + nom + tavsif + o'ng tomon"
 * naqshi 4 ekranda bir xil takrorlanardi (nasiya, ta'minotchilar, xarajatlar,
 * kategoriyalar).
 *
 * Katalogdagi `ProductRow` ataylab bu komponentga o'tkazilmadi: unda rasm,
 * tanlash rejimi, ikki qatorli sarlavha va soya bor — uni sig'dirish uchun
 * 4 ta qo'shimcha prop kerak bo'lardi, ya'ni abstraksiya takrorlanishdan
 * ko'ra qimmatroqqa tushardi.
 *
 * `memo` bilan o'ralgan (A10): `FlatList` qayta render qilganda o'zgarmagan
 * qatorlar qayta chizilmaydi — shuning uchun `onPress` chaqiruvchi tomonda
 * `useCallback` bilan barqaror bo'lishi kerak.
 */
export const ListItemCard = memo(function ListItemCard({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
  titleLines = 1,
}: {
  /** Chapdagi element — `Avatar`, ikonka doirasi yoki rasm. */
  leading?: ReactNode;
  title: string;
  /** Matn bo'lsa uslub avtomatik; murakkabroq holat uchun tayyor node. */
  subtitle?: ReactNode;
  /** O'ng tomon — narx, belgi (badge) yoki tugmalar. */
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  titleLines?: number;
}) {
  const colors = useColors();

  const content = (
    <>
      {leading}
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink" numberOfLines={titleLines}>
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
    </>
  );

  // `className` emas, `style`: qator `PressableScale` ichida chiziladi va
  // animatsiyalangan komponentda `className` bilan `style`ni aralashtirish —
  // Sprint 10 dagi uslub yo'qolishi bilan bir xil turdagi xavf.
  const style = {
    marginBottom: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  };

  // Bosilmaydigan qatorlar uchun `Pressable` ishlatilmaydi — aks holda
  // screen reader ularni tugma deb e'lon qiladi.
  if (!onPress) {
    return <View style={style}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={style}
    >
      {content}
    </PressableScale>
  );
});

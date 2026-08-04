import { memo, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

import { useColors } from "@/theme/theme-store";

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

  const className = "mb-2.5 flex-row items-center gap-3 rounded-2xl bg-surface p-3.5";
  const style = { borderWidth: 0.5, borderColor: colors.line };

  // Bosilmaydigan qatorlar uchun `Pressable` ishlatilmaydi — aks holda
  // screen reader ularni tugma deb e'lon qiladi.
  if (!onPress) {
    return (
      <View className={className} style={style}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      className={className}
      style={style}
    >
      {content}
    </Pressable>
  );
});

import { useState, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { text } from "@/theme/tokens";

/**
 * Sozlama qatori (ikonka + sarlavha + izoh + chevron).
 *
 * Ikonka ATAYIN yalang'och va monoxrom — tintli `IconChip` kvadrati EMAS.
 * Ilgari har qatorda ko'k kvadrat turardi (undan oldin esa har qatorda
 * boshqa rang: binafsha/sariq/yashil). Ikkalasi ham bir xil muammoni
 * hal qilmagan: qator ikonkasi hech qanday holat bildirmaydi, ya'ni rang
 * u yerda ma'lumot tashimaydi — faqat ekranni shovqinli qiladi.
 * Qatorlarni ikonka SHAKLI ajratadi; brend ko'ki esa faqat HAQIQIY urg'u
 * uchun (faol tab, tugma, avatar) saqlab qo'yiladi.
 *
 * `settings.tsx` ichida yozilgan edi; profil ekrani ham xuddi shu naqshni
 * ishlatgani uchun umumiy komponentga chiqarildi.
 */
export function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  last = false,
  muted = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Chevron o'rniga boshqa element (nishon, spinner). */
  right?: ReactNode;
  last?: boolean;
  /** Ikkilamchi qator (Diagnostika) — ikonka yanada bo'g'iq. */
  muted?: boolean;
  /** Xavfli amal (chiqish) — matn qizil, chevron yo'q. */
  danger?: boolean;
}) {
  const colors = useColors();
  const [pressed, setPressed] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        // `onPress` bo'lmasa bu qator — ma'lumot (kirish usuli, do'kon nomi):
        // tugma bo'lib e'lon qilinmasligi va bosilganda "yonmasligi" kerak.
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        android_ripple={onPress ? { color: colors.line } : undefined}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          // 20px ikonka + 2×16px = 52px balandlik — a11y minimumidan (44px)
          // yuqori. Chip olib tashlangani uchun paddingni oshirish SHART edi.
          paddingVertical: 16,
          backgroundColor: pressed && onPress ? colors.bg : colors.surface,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.danger : muted ? colors.tabInactive : colors.muted}
          style={{ width: 20, marginRight: 16 }}
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              fontSize: text.base,
              fontWeight: "600",
              color: danger ? colors.danger : colors.ink,
              lineHeight: 20,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 1, lineHeight: 16 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {/* Chevron faqat bosiladigan qatorda (xavfli amalda ham yo'q — u
            boshqa ekranga olib bormaydi). */}
        {right ??
          (onPress && !danger ? (
            <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} style={{ marginLeft: 10 }} />
          ) : null)}
      </Pressable>
      {/* Divider matn boshlanadigan joydan boshlanadi: 16 (padding) + 20
          (ikonka) + 16 (oraliq) = 52. */}
      {!last && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 52 }} />}
    </>
  );
}

import { useState, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { text } from "@/theme/tokens";
import { IconChip } from "@/components/ui/icon-chip";

/**
 * Sozlama qatori (ikonka chipi + sarlavha + izoh + chevron).
 *
 * Ikonka chiplari ATAYIN bitta rangda (brend ko'ki): ilgari har qatorda
 * boshqa rang bor edi (binafsha/sariq/yashil) — bu ranglar hech qanday
 * ma'no bermasdi, faqat ekranni rang-barang qilardi va tungi rejimda
 * tekshirilmagan qattiq HEX qiymatlar edi. Qatorlarni ikonka SHAKLI
 * ajratadi, rang esa brendni ushlab turadi.
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
  /** Ikkilamchi qator (Diagnostika) — brend ko'ki emas, neytral. */
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
          // 38px chip + 2×14px = 66px balandlik — a11y minimumidan (44px) yuqori
          paddingVertical: 14,
          backgroundColor: pressed && onPress ? colors.bg : colors.surface,
        }}
      >
        <View style={{ marginRight: 14 }}>
          <IconChip icon={icon} tone={danger ? "danger" : muted ? "neutral" : "brand"} />
        </View>
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
      {!last && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 68 }} />}
    </>
  );
}

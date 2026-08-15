import { View, Text } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { useColors } from "@/theme/theme-store";

/**
 * uscan brend belgisi — "Kadr-u": skaner kadrining to'rt burchagi, ichida
 * "u" harfi va skaner chizig'i.
 *
 * Nega SVG (ilgari belgi `Text`dan yasalgan edi):
 *  - tizim shrifti iOS'da San Francisco, Android'da Roboto — belgi har
 *    qurilmada boshqacha chizilardi, ya'ni brend qat'iy emasdi;
 *  - so'zdan yasalgan belgining IKONKA shakli yo'q edi: 20 px da "scan"
 *    so'zi o'qilmaydi, shu sabab ilova ikonkasi uchun alohida rasm
 *    ishlatilgan va ekranda ikkita belgi paydo bo'lgan edi.
 *
 * `tone="onDark"` — brend gradienti/to'q fon ustida (auth hero'si): shakl
 * o'zgarmaydi, faqat kontrast palitrasi almashadi.
 */
export function LogoMark({
  size = 28,
  tone = "brand",
}: {
  size?: number;
  tone?: "brand" | "onDark";
}) {
  const colors = useColors();
  const onDark = tone === "onDark";

  const frame = onDark ? "rgba(255,255,255,0.9)" : colors.heading;
  const letter = onDark ? "#FFFFFF" : colors.primary;
  const beam = onDark ? "rgba(255,255,255,0.55)" : colors.primaryLight;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* skaner kadri — to'rt burchak */}
      <Path d="M5 21V13a8 8 0 0 1 8-8h8" fill="none" stroke={frame} strokeWidth={6} strokeLinecap="round" />
      <Path d="M43 5h8a8 8 0 0 1 8 8v8" fill="none" stroke={frame} strokeWidth={6} strokeLinecap="round" />
      <Path d="M59 43v8a8 8 0 0 1-8 8h-8" fill="none" stroke={frame} strokeWidth={6} strokeLinecap="round" />
      <Path d="M21 59h-8a8 8 0 0 1-8-8v-8" fill="none" stroke={frame} strokeWidth={6} strokeLinecap="round" />
      {/* skaner chizig'i */}
      <Rect x={20} y={18} width={24} height={4} rx={2} fill={beam} />
      {/* "u" */}
      <Path d="M23 29v6a9 9 0 0 0 18 0v-6" fill="none" stroke={letter} strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Belgi + "uscan" so'zi — auth, onboarding va Bosh ekran sarlavhasi uchun.
 * Faqat belgi kerak bo'lgan joyda (ikonka o'lchamlari) `LogoMark` ishlatiladi.
 *
 * `size` — so'zning kegli; belgi unga nisbatan o'lchanadi, shunda ikkalasi
 * bir xil optik balandlikda turadi.
 */
export function Logo({
  size = 24,
  tone = "brand",
}: {
  size?: number;
  tone?: "brand" | "onDark";
}) {
  const colors = useColors();

  return (
    // Bitta a11y tuguni: aks holda ekran o'quvchi belgi va so'zni ikkita
    // alohida element qilib o'qiydi (bu — logo, ikkita narsa emas).
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: Math.round(size * 0.34) }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="uscan"
    >
      <LogoMark size={Math.round(size * 1.4)} tone={tone} />
      <Text
        style={{
          fontSize: size,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: tone === "onDark" ? "#FFFFFF" : colors.heading,
        }}
      >
        uscan
      </Text>
    </View>
  );
}

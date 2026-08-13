import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/theme/theme-store";
import { radius, space } from "@/theme/tokens";
import { useMotion, easing } from "@/theme/motion";

/**
 * Yuklanish o'rindig'i (skeleton).
 *
 * Nega `ActivityIndicator` emas: aylanuvchi doira "nimadir yuklanmoqda" deydi,
 * lekin NIMA yuklanayotganini ko'rsatmaydi va yuklangach kontent to'satdan
 * paydo bo'lib, sahifa sakraydi. Skeleton kelayotgan kontentning shaklini
 * oldindan egallaydi — ekran tinch qoladi.
 *
 * Yaltirash o'rniga oddiy shaffoflik pulsi ishlatiladi: u arzon (faqat
 * `opacity`, GPU'da) va tungi rejimda ham tabiiy ko'rinadi.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  rounded = radius.sm,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}) {
  const colors = useColors();
  const motion = useMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (!motion.enabled) {
      opacity.set(0.55);
      return;
    }
    opacity.set(
      withRepeat(withTiming(1, { duration: motion.slow, easing: easing.inOut }), -1, true),
    );
  }, [opacity, motion.enabled, motion.slow]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.line },
        animated,
      ]}
    />
  );
}

/**
 * Ro'yxat qatori shaklidagi o'rindiq — `ListItemCard` o'lchamlariga mos
 * (doira + ikki qator matn + o'ngda summa).
 */
export function SkeletonListItem() {
  const colors = useColors();

  return (
    <View
      style={{
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Skeleton width={44} height={44} rounded={radius.full} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={16} />
    </View>
  );
}

/** Bir nechta o'rindiq — ro'yxat yuklanayotganda. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: space.lg, paddingTop: 4 }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
}

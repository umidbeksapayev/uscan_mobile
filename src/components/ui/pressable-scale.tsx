import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useMotion, easing } from "@/theme/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Bosilganda biroz kichrayadigan `Pressable`.
 *
 * Nega kerak: ilovada bosilish javobi tarqoq edi — ba'zi joyda
 * `android_ripple`, ba'zi joyda fon rangi almashishi, ko'p joyda esa
 * UMUMAN javob yo'q (tugmani bosdingizmi yoki yo'qmi — bilib bo'lmasdi).
 * Ko'lam o'zgarishi ikkala platformada bir xil ishlaydi va rangga bog'liq
 * emas, ya'ni tungi rejimda ham bir xil seziladi.
 *
 * `transform` GPU'da chiziladi (Reanimated worklet), shuning uchun ro'yxat
 * qatorlarida ham qimmatga tushmaydi.
 *
 * "Harakatni kamaytirish" yoqilgan bo'lsa ko'lam umuman o'zgarmaydi —
 * `useMotion()` buni o'zi hal qiladi.
 */
export function PressableScale({
  children,
  style,
  disabled,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const motion = useMotion();
  const scale = useSharedValue(1);

  // `.get()` / `.set()` — `.value` emas: React Compiler `.value` ga yozishni
  // "o'zgarmas qiymatni o'zgartirish" deb hisoblaydi va optimizatsiyadan
  // chiqarib yuboradi (`react-hooks/immutability`).
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.set(withTiming(motion.pressScale, { duration: motion.fast, easing: easing.out }));
        }
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: motion.fast, easing: easing.out }));
        rest.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

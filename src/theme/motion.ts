import { Easing, useReducedMotion } from "react-native-reanimated";

/**
 * Harakat tokenlari — davomiylik va easing.
 *
 * `colors.ts` ranglar uchun, `tokens.ts` o'lchamlar uchun nima qilsa, bu fayl
 * HARAKAT uchun shuni qiladi. Ilgari ilovada atigi ikkita animatsiya bor edi
 * (skaner lazeri va sync toast), ikkalasi ham o'z raqamini o'zi tanlagan.
 */

/** Davomiylik (ms). Uch qadam — oraliq qiymatlar ritmni buzadi. */
export const duration = {
  /** 150 — bosilish javobi, holat almashishi. Foydalanuvchi "darhol" deb his qiladi. */
  fast: 150,
  /** 220 — element kirishi/chiqishi, kengayish. */
  base: 220,
  /** 320 — katta sirt (oyna, ekran o'tishi). */
  slow: 320,
} as const;

/**
 * Easing. Ikkitasi yetarli:
 * - `out` — element PAYDO bo'lganda (tez boshlanib, sekin to'xtaydi — tabiiy)
 * - `inOut` — ikki holat orasidagi o'tish
 */
export const easing = {
  out: Easing.out(Easing.quad),
  inOut: Easing.inOut(Easing.quad),
} as const;

/** Bosilganda element shu nisbatda kichrayadi. */
export const PRESS_SCALE = 0.97;

/**
 * Harakat sozlamalari, "harakatni kamaytirish" hisobga olingan holda.
 *
 * Tizimda shu sozlama yoqilgan bo'lsa `enabled: false` va barcha davomiylik
 * **0** bo'ladi — animatsiya kodini o'chirib o'tirish shart emas, u shunchaki
 * bir zumda tugaydi. Shu tufayli har chaqiruv joyida `useReducedMotion()` ni
 * qo'lda tekshirish kerak emas: Sprint 11 da skanerda aynan shunday qo'lda
 * tekshiruv yozilgan edi va uni har yangi animatsiyada takrorlash — unutish
 * uchun ochiq eshik.
 *
 * ```tsx
 * const m = useMotion();
 * scale.set(withTiming(pressed ? m.pressScale : 1, { duration: m.fast }));
 * ```
 *
 * ⚠️ `entering`/`exiting` (masalan `FadeInDown`) uchun bu KERAK EMAS —
 * Reanimated ularga standart holda `ReduceMotion.System` qo'yadi, ya'ni
 * tizim sozlamasi o'zi hisobga olinadi (`BaseAnimationBuilder`). Qo'shimcha
 * gate yozish ortiqcha.
 */
export function useMotion() {
  const reduced = useReducedMotion();

  return {
    enabled: !reduced,
    fast: reduced ? 0 : duration.fast,
    base: reduced ? 0 : duration.base,
    slow: reduced ? 0 : duration.slow,
    /** Bosilganda ko'lam — kamaytirilgan rejimda o'lcham umuman o'zgarmaydi. */
    pressScale: reduced ? 1 : PRESS_SCALE,
  };
}

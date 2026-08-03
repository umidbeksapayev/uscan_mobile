/**
 * Brend ranglari — JS qiymatlar (NativeWind className ishlamaydigan joylar uchun:
 * tab tint, ikona rangi, dinamik style). Tailwind tokenlari bilan bir xil.
 *
 * `global.css`dagi CSS o'zgaruvchilari (`--color-*`) shu yerdagi qiymatlar bilan
 * BIR XIL bo'lishi shart — className (`bg-surface`) va inline style
 * (`colors.surface`) bir xil rang berishi kerak.
 *
 * Dark rejim uchun faqat NEYTRAL tokenlar o'zgaradi (fon/matn/chegara). Brend va
 * semantik ranglar (primary/success/danger/warning/kirim) ikkala rejimda bir xil
 * qoladi — to'ldirilgan tugma/badge'larda oq matn kontrasti buzilmasligi uchun.
 */
export const colors = {
  primary: "#2F80ED",
  primaryDeep: "#0F3D6E",
  primaryLight: "#7DB4F5",
  primaryTint: "#EAF2FE",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#F59E0B",
  kirim: "#0E9F6E", // Kirim (zumrad) — sotuv/nasiyadan ajratish uchun
  kirimTint: "#E6F7F0",
  bg: "#F5F8FF",
  surface: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E6EAF0",
  tabInactive: "#94A3B8",
} as const;

/** Ilova rang palitrasining tipi — light/dark ikkalasi ham shu shaklga ega. */
export type AppColors = { -readonly [K in keyof typeof colors]: string };

/**
 * Tungi rejim palitrasi (slate asosida, brend ko'ki bilan uyg'un).
 * `bg` sahifa foni (eng to'q), `surface` kartalar (bir pog'ona ochiqroq).
 */
export const darkColors: AppColors = {
  ...colors,
  primaryTint: "#172554", // primary (#2F80ED) o'qiladigan to'q navy tint
  kirimTint: "#0D2E23",
  bg: "#0F172A",
  surface: "#1E293B",
  ink: "#F8FAFC",
  muted: "#94A3B8",
  line: "#334155",
  tabInactive: "#64748B",
};

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
  /**
   * Ekran sarlavhalari uchun brend matn rangi. `primaryDeep`dan AJRATILGAN:
   * `primaryDeep` to'q navy FON sifatida ham ishlatiladi (oq matn bilan), shuning
   * uchun u ikkala rejimda o'zgarmaydi; sarlavha matni esa tungi rejimda
   * yorishishi shart, aks holda to'q fonda o'qib bo'lmaydi.
   */
  heading: "#0F3D6E",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#F59E0B",
  kirim: "#0E9F6E", // Kirim (zumrad) — sotuv/nasiyadan ajratish uchun
  kirimTint: "#E6F7F0",
  // Semantik panel ranglari (badge/banner: och fon + to'q matn).
  // Tungi rejimda teskari bo'ladi: to'q fon + yorqin matn.
  successTint: "#E7F6EE",
  successInk: "#0F6E56",
  successBorder: "#BBF7D0",
  dangerTint: "#FDECEC",
  dangerInk: "#B42318",
  dangerBorder: "#F7C6C6",
  warningTint: "#FCF1DD",
  warningInk: "#92600A",
  neutralTint: "#EEF2F7",
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
  heading: "#7DB4F5", // to'q fonda o'qiladigan brend ko'ki (primaryLight)
  kirimTint: "#0D2E23",
  successTint: "#0D2E23",
  successInk: "#34D399",
  successBorder: "#14532D",
  dangerTint: "#3B1214",
  dangerInk: "#FCA5A5",
  dangerBorder: "#7F1D1D",
  warningTint: "#3B2A08",
  warningInk: "#FBBF24",
  neutralTint: "#334155",
  bg: "#0F172A",
  surface: "#1E293B",
  ink: "#F8FAFC",
  muted: "#94A3B8",
  line: "#334155",
  tabInactive: "#64748B",
};

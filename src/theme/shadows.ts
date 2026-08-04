import { Platform, type ViewStyle } from "react-native";

/**
 * Soya tokenlari (audit A7) — ilgari bir xil qiymatlar 11 faylda qo'lda
 * takrorlanardi (`shadowOpacity: 0.05, shadowRadius: 8, ...`).
 *
 * Rang parametr sifatida uzatiladi, chunki u mavzuga bog'liq: karta soyalari
 * `useColors().shadow` (tungi rejimda sof qora), rangli "glow" esa urg'u
 * rangini oladi. Shu sababli bu yerda `colors`ga import yo'q — token fayli
 * mavzudan mustaqil qoladi.
 *
 * ⚠️ iOS soyani `shadow*`, Android esa `elevation` bilan chizadi — ikkalasi
 * ham berilishi kerak, aks holda bitta platformada soya yo'qoladi.
 */
export type ShadowStyle = Pick<
  ViewStyle,
  "shadowColor" | "shadowOpacity" | "shadowRadius" | "shadowOffset" | "elevation"
>;

/** Ro'yxat kartalari va statistika kartalari — zo'rg'a sezilarli ko'tarilish. */
export function shadowSm(color: string): ShadowStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

/** Suzuvchi tugma (FAB) — kontent ustida aniq ajralib turadi. */
export function shadowMd(color: string): ShadowStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}

/** Pastki navigatsiya paneli — keng va yumshoq, yuqoriga qaragan. */
export function shadowNav(color: string): ShadowStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}

/**
 * Sozlamalar uslubidagi panel — iOS'da biroz quyuqroq (0.1), Android'da
 * oddiy elevation. `Platform.select` ataylab: bu yagona preset bo'lib,
 * iOS va Android qiymatlari mustaqil sozlangan.
 */
export function shadowPanel(color: string): ShadowStyle {
  return (
    Platform.select<ShadowStyle>({
      ios: {
        shadowColor: color,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }) ?? {}
  );
}

/**
 * Rangli "glow" — urg'u rangidagi soya (asosiy CTA va dashboard gradient
 * kartalari). Rang `colors.shadow` emas, elementning o'z rangi bo'ladi.
 */
export function shadowGlow(color: string): ShadowStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  };
}

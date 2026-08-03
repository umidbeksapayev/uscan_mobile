import { useColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme } from "nativewind";
import { create } from "zustand";

import { colors, darkColors, type AppColors } from "@/theme/colors";
import { meta, MetaKeys } from "@/lib/offline/mmkv";

export type ThemeMode = "system" | "light" | "dark";

const VALID_MODES: ThemeMode[] = ["system", "light", "dark"];

function readStoredMode(): ThemeMode {
  const stored = meta.getString(MetaKeys.themeMode) as ThemeMode | undefined;
  return stored && VALID_MODES.includes(stored) ? stored : "system";
}

const initialMode = readStoredMode();

/**
 * NativeWind runtime'ga rejimni uzatadi — shundan keyin `dark:` variantlari va
 * `global.css`dagi `.dark:root` rang o'zgaruvchilari avtomatik qo'llanadi
 * (ya'ni `bg-surface`, `text-ink` kabi klasslar faylga tegmasdan o'zgaradi).
 */
function applyColorScheme(mode: ThemeMode) {
  nativewindColorScheme.set(mode);
}

// Birinchi renderdan oldin saqlangan rejimni tiklaymiz (i18n init'ga o'xshab).
applyColorScheme(initialMode);

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: initialMode,
  setThemeMode: (mode) => {
    meta.setString(MetaKeys.themeMode, mode);
    applyColorScheme(mode);
    set({ themeMode: mode });
  },
}));

/**
 * Hozir tungi rejim faolmi — tanlangan rejim + OS sozlamasini hisobga oladi.
 * `StatusBar` uslubi kabi mavzuga bog'liq qarorlar uchun.
 */
export function useIsDark(): boolean {
  const themeMode = useThemeStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  return themeMode === "dark" || (themeMode === "system" && systemScheme === "dark");
}

/**
 * Joriy rejim bo'yicha JS rang palitrasi — `className` ishlamaydigan joylar
 * (ikonka `color`, dinamik `style`) uchun. `className` ishlatiladigan joyda bu
 * hook KERAK EMAS: u yerda ranglar CSS o'zgaruvchilari orqali o'zi o'zgaradi.
 */
export function useColors(): AppColors {
  return useIsDark() ? darkColors : colors;
}

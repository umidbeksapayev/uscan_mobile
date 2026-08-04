import { BaseToast, ErrorToast, type ToastConfig } from "react-native-toast-message";

import { useColors } from "@/theme/theme-store";

/**
 * Toast uslublari — kutubxona standarti QATTIQ oq kartochka, shuning uchun
 * tungi rejimda yorqin dog' bo'lib chiqardi. Bu yerda ranglar palitradan
 * olinadi (`useColors`), ya'ni mavzu bilan birga o'zgaradi.
 *
 * Hook root `_layout`da chaqiriladi va natija `<Toast config={...} />` ga
 * uzatiladi — mavzu almashganda config qayta hisoblanadi.
 */
export function useToastConfig(): ToastConfig {
  const colors = useColors();

  const base = {
    style: {
      backgroundColor: colors.surface,
      borderLeftWidth: 5,
      borderRadius: 14,
      // To'q fonda kartochka fondan ajralib turishi uchun ingichka chegara
      borderWidth: 1,
      borderColor: colors.line,
    },
    contentContainerStyle: { paddingHorizontal: 14 },
    text1Style: { fontSize: 15, fontWeight: "600" as const, color: colors.ink },
    text2Style: { fontSize: 13, color: colors.muted },
  };

  return {
    success: (props) => (
      <BaseToast
        {...props}
        {...base}
        style={{ ...base.style, borderLeftColor: colors.success }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        {...base}
        style={{ ...base.style, borderLeftColor: colors.danger }}
      />
    ),
    info: (props) => (
      <BaseToast
        {...props}
        {...base}
        style={{ ...base.style, borderLeftColor: colors.primary }}
      />
    ),
  };
}

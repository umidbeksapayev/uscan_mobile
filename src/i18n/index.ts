import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { meta, MetaKeys } from "@/lib/offline/mmkv";
import uzLatn from "./locales/uz-Latn.json";
import uzCyrl from "./locales/uz-Cyrl.json";
import ru from "./locales/ru.json";

/**
 * i18n (P4) — web `src/i18n/config.ts` bilan BIR XIL resurslar (locales/*.json
 * webdan ko'chirilgan; kalitlar umumiy, yangi kalit ikkala repoga qo'shiladi).
 * Til MMKV'da saqlanadi (web localStorage'ga mos), default — uz-lotin.
 */
export const LANGUAGES = [
  { code: "uz-Latn", label: "O'zbekcha" },
  { code: "uz-Cyrl", label: "Ўзбекча" },
  { code: "ru", label: "Русский" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: LangCode = "uz-Latn";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      "uz-Latn": { translation: uzLatn },
      "uz-Cyrl": { translation: uzCyrl },
      ru: { translation: ru },
    },
    lng: (meta.getString(MetaKeys.language) as LangCode | undefined) ?? DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

/** Tilni almashtirish + MMKV'ga yozish (keyingi ochilishda saqlanadi). */
export function setLanguage(code: LangCode): void {
  meta.setString(MetaKeys.language, code);
  void i18n.changeLanguage(code);
}

export default i18n;

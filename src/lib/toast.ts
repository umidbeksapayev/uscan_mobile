import Toast from "react-native-toast-message";

/**
 * Bildirishnoma (toast) — bloklamaydigan, o'z-o'zidan yo'qoladigan xabarlar uchun.
 * Bloklash/tasdiq talab qiladigan oqimlar (o'chirish, chiqish, tanlov) uchun
 * `Alert.alert` ishlatilishi kerak — toast ularni almashtirmaydi.
 *
 * `<Toast />` root `_layout` da bir marta mount qilinadi.
 */
export const toast = {
  success: (title: string, message?: string) =>
    Toast.show({ type: "success", text1: title, text2: message }),
  error: (title: string, message?: string) =>
    Toast.show({ type: "error", text1: title, text2: message }),
  info: (title: string, message?: string) =>
    Toast.show({ type: "info", text1: title, text2: message }),
};

import type { TextStyle } from "react-native";

/**
 * Bir xil kenglikdagi ("tabular") raqamlar.
 *
 * Standart shriftda `1` boshqa raqamlardan tor — shu sabab yangilanadigan
 * summa (savat jami, kassa hisobi) har o'zgarganda sakrab turadi, ustunga
 * terilgan narxlar esa tekis chiziqda turmaydi. POS'da raqam eng ko'p
 * o'qiladigan element, shuning uchun barcha son ko'rsatkichlariga shu uslub
 * qo'llanadi.
 *
 * Faqat SON ko'rsatiladigan `Text`ga bering — oddiy matnda farqi bilinmaydi,
 * ba'zi shriftlarda esa harf oralig'ini buzadi.
 */
export const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

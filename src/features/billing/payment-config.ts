/**
 * Manual to'lov rekvizitlari.
 *
 * Bu qiymatlar ATAYLAB kodda (DB'da emas): ular brend/hisob ma'lumoti,
 * do'konga bog'liq emas va tez-tez o'zgarmaydi. O'zgarsa — bitta joy.
 * (Tarif NARXLARI esa DB'da — ular tez-tez o'zgarishi mumkin, reliz
 * talab qilmasligi kerak. Ko'r. `plans` jadvali, 041-migratsiya.)
 *
 * Kelajakda Payme/Click qo'shilganda bu fayl `provider = "manual_card"`
 * uchun konfiguratsiya bo'lib qoladi — boshqa provayderlar o'z
 * konfiguratsiyasini oladi (`payments.provider` ustuni allaqachon bor).
 */

/**
 * Kartaga o'tkazma uchun rekvizitlar.
 *
 * ⚠️ `number` — TO'LIQ raqam bo'lishi SHART. UI uni maskalangan holda
 * (`maskCardNumber`) ko'rsatadi, lekin "Nusxalash" tugmasi to'liq raqamni
 * beradi — foydalanuvchi uni bank ilovasiga qo'yadi. Maskalangan raqam
 * bilan to'lov qilib bo'lmaydi.
 *
 * Bu maxfiy ma'lumot EMAS (pul qabul qilish uchun mijozga beriladigan
 * raqam), shuning uchun mijoz kodida turishi xavfsizlik muammosi emas.
 */
export const MANUAL_CARD = {
  // TODO: haqiqiy 16 xonali karta raqamini shu yerga yozing.
  number: "9860XXXXXXXX8200",
  holder: "USCAN",
} as const;

/** Chekni yuborish uchun zaxira kanal (talab #5). */
export const SUPPORT_TELEGRAM = "um1d_khiva";

export function supportTelegramUrl(): string {
  return `https://t.me/${SUPPORT_TELEGRAM}`;
}

/**
 * To'lov ma'lumotnomasi — foydalanuvchi Telegram orqali yuborganda admin
 * qaysi to'lov haqida ekanini bilishi uchun. To'liq UUID uzun va xato
 * yozishga qulay emas; birinchi 8 belgi amalda yetarli darajada noyob.
 */
export function paymentRef(paymentId: string): string {
  return paymentId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

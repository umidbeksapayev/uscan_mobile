/**
 * Jurnal domenlari — SOF modul.
 *
 * Nima uchun: `logError("print.manager.attempt1", e)` da domen scope satrining
 * ichida yashiringan edi, ya'ni Diagnostika ekranida "printer muammosimi yoki
 * sotuvmi" degan savolga javob berish uchun barcha yozuvlarni ko'z bilan
 * o'qish kerak edi.
 *
 * ⚠️ Domen scope PREFIKSIDAN chiqariladi, chaqiruvchidan emas — shu tufayli
 * mavjud ~70 ta `logError(...)` chaqirig'ining birortasi ham o'zgarmadi.
 */

export type LogDomain =
  | "PRINT"
  | "SALE"
  | "SYNC"
  | "SCANNER"
  | "CATALOG"
  | "AUTH"
  | "NOTIFY"
  | "AI"
  | "DB"
  | "APP";

/**
 * `PAYMENT` ALOHIDA domen sifatida qo'shilmadi: bu ilovada to'lov va sotuv
 * bitta tranzaksiya (`process_sale_cart`) — ularni ajratish jurnalda soxta
 * chegara yaratardi va bitta hodisa ikki domenga bo'linib ketardi.
 */
const PREFIX_DOMAIN: Record<string, LogDomain> = {
  print: "PRINT",
  printerSettings: "PRINT",

  checkout: "SALE",
  payment: "SALE",
  qr: "SALE",
  offlineSales: "SALE",
  history: "SALE",

  sync: "SYNC",
  saleQueue: "SYNC",

  scanner: "SCANNER",

  lookup: "CATALOG",
  products: "CATALOG",
  customer: "CATALOG",
  supply: "CATALOG",

  auth: "AUTH",
  login: "AUTH",
  reset: "AUTH",
  verify: "AUTH",
  profile: "AUTH",
  deepLink: "AUTH",
  admin: "AUTH",

  notify: "NOTIFY",
  push: "NOTIFY",

  ai: "AI",

  db: "DB",
  sqlite: "DB",

  splash: "APP",
  errorBoundary: "APP",
};

/** Scope prefiksidan domen. Noma'lum prefiks → `APP` (yo'qolmaydi, faqat guruhsiz). */
export function domainForScope(scope: string): LogDomain {
  const prefix = scope.split(".")[0];
  return PREFIX_DOMAIN[prefix] ?? "APP";
}

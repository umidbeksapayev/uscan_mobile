/**
 * Printer holat mantiqi — SOF funksiyalar (native import YO'Q, alohida test
 * qilinadi). `printer-manager.ts` shu qarorlarni bajaradi, o'zi qaror qabul
 * qilmaydi — `sync-math.ts` / `sync.ts` juftligidagi naqsh.
 */

/** Printerning jonli holati (sozlamadagi TANLOV emas — u `printer-settings.ts`da). */
export type PrinterStatus = "disconnected" | "connecting" | "connected" | "printing" | "error";

/**
 * Chop etish xatosining turi. Qayta urinish qarori shunga bog'liq:
 *  - `connection` — aloqa uzildi/yo'q → qayta ulanib urinamiz
 *  - `cancelled`  — foydalanuvchi tizim dialogini yopdi → XATO EMAS, urinmaymiz
 *  - `device`     — printerda qog'oz yo'q / qopqoq ochiq → qayta urinish
 *                   yordam bermaydi, odam aralashuvi kerak
 *  - `unknown`    — tasniflab bo'lmadi → bir marta qayta urinamiz
 */
export type PrintErrorKind = "connection" | "cancelled" | "device" | "unknown";

/**
 * Bitta chek uchun eng ko'p urinish. 3 ta — chunki har urinish qayta ulanish
 * bilan keladi (~2-4s). Ko'proq qilinsa kassir "ilova osilib qoldi" deb
 * o'ylaydi; kamroq qilinsa uxlab qolgan printer birinchi urinishda uyg'onmaydi.
 */
export const MAX_PRINT_ATTEMPTS = 3;

/** Backoff tepasi — bundan uzoq kutish kassa oqimida qabul qilinmaydi. */
const BACKOFF_CAP_MS = 4000;

function message(err: unknown): string {
  if (err instanceof Error) return err.message.toLowerCase();
  if (typeof err === "string") return err.toLowerCase();
  const m = (err as { message?: unknown })?.message;
  return typeof m === "string" ? m.toLowerCase() : "";
}

/**
 * Xom xatoni turga ajratadi. Naqshlar `react-native-bluetooth-classic`,
 * Android BluetoothGatt va `expo-print` haqiqiy xabarlaridan olingan.
 */
export function classifyPrintError(err: unknown): PrintErrorKind {
  const msg = message(err);

  // Foydalanuvchi tizim print dialogini yopdi — bu muvaffaqiyatsizlik EMAS.
  if (/cancel|dismiss|did not (print|complete)/.test(msg)) return "cancelled";

  // Printerning o'zi javob berdi, lekin chiqara olmadi.
  if (/no paper|out of paper|paper (empty|out|jam)|cover (open|is open)/.test(msg)) {
    return "device";
  }

  // Aloqa: SPP uzilishi, GATT xatolari (status 133 — mashhur Android xatosi),
  // Bluetooth o'chirilgan, qurilma topilmadi, yozish/ulanish muhlati.
  if (
    /not connected|no connection|connection (lost|failed|closed|refused|reset)|disconnect/.test(msg) ||
    /socket|broken pipe|read failed|write failed|stream closed/.test(msg) ||
    /gatt|status 133|status 257/.test(msg) ||
    /bluetooth.*(off|disabled|not enabled)|not enabled.*bluetooth/.test(msg) ||
    /device (not found|unavailable|is not|unreachable)|unable to connect/.test(msg) ||
    /timeout|timed out|etimedout|econn|ehostunreach|enetunreach/.test(msg)
  ) {
    return "connection";
  }

  return "unknown";
}

/**
 * Qayta urinishdan oldin kutish (ms). Eksponensial: 1→400, 2→800, 3→1600 …
 * `BACKOFF_CAP_MS` da to'xtaydi. `attempt` — TUGAGAN urinish raqami (1 dan).
 */
export function backoffMs(attempt: number): number {
  if (attempt < 1) return 0;
  return Math.min(BACKOFF_CAP_MS, 400 * 2 ** (attempt - 1));
}

/**
 * Yana urinamizmi. `attempt` — TUGAGAN urinishlar soni.
 *
 * `cancelled` va `device` HECH QACHON qayta urinilmaydi: birinchisi xato emas,
 * ikkinchisida esa qog'oz solinmaguncha natija o'zgarmaydi — cheksiz urinish
 * faqat kassirni kutishga majbur qiladi.
 */
export function shouldRetryPrint(attempt: number, kind: PrintErrorKind): boolean {
  if (kind === "cancelled" || kind === "device") return false;
  return attempt < MAX_PRINT_ATTEMPTS;
}

/**
 * Xato turidan keyin ulanishni uzilgan deb hisoblash kerakmi. `connection`
 * xatosidan keyin transport "ulangan" deb yolg'on aytishi mumkin (BT stack
 * holati eskirgan bo'ladi) — shuning uchun majburan uzib, qaytadan ulanamiz.
 */
export function shouldForceReconnect(kind: PrintErrorKind): boolean {
  return kind === "connection" || kind === "unknown";
}

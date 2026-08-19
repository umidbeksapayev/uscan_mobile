/**
 * HID (klaviatura rejimidagi) skaner kiritishini yig'ish — SOF mantiq.
 *
 * Arzon USB/Bluetooth skanerlarning aksariyati o'zini KLAVIATURA deb
 * tanishtiradi: shtrix-kodni "yozib" beradi va oxirida Enter bosadi. Shuning
 * uchun bu yerda native modul ham, yangi bog'liqlik ham yo'q — ko'rinmas
 * `TextInput` yetarli.
 *
 * Ikki tugash shakli qo'llab-quvvatlanadi:
 *  1. TERMINATOR (Enter) — zavod sozlamasi bo'yicha ko'pchilik skanerda bor
 *  2. TANAFFUS — terminator o'chirilgan skanerlar uchun (aks holda kod
 *     buferda abadiy qolib ketardi va HECH QACHON o'qilmasdi)
 */

export interface HidState {
  buffer: string;
  /** Oxirgi belgi kelgan vaqt — tanaffusni o'lchash uchun. */
  lastAt: number;
}

/**
 * Terminatorsiz skanerni tugagan deb hisoblaydigan tanaffus.
 *
 * Skaner belgilarni ~5–20ms oralig'ida yuboradi, ya'ni 120ms uning ichida
 * hech qachon tushmaydi. Pastroq qilinsa uzun kod o'rtasidan bo'linib
 * ketardi, balandroq qilinsa kassir keyingi skanni kutib qolardi.
 */
export const HID_IDLE_MS = 120;

/** `validate-scan.ts` bilan bir xil chegaralar — bufer bo'sh-bo'sh ishlamasin. */
const MIN_LENGTH = 3;
const MAX_LENGTH = 64;

export interface FeedResult {
  /** Yangi holat; `null` — bufer tozalandi. */
  state: HidState | null;
  /** Tayyor kod; `null` — hali yig'ilyapti. */
  emit: string | null;
}

function finish(raw: string): string | null {
  const code = raw.trim();
  return code.length >= MIN_LENGTH && code.length <= MAX_LENGTH ? code : null;
}

/**
 * `TextInput` dan kelgan TO'LIQ matn (kumulyativ qiymat).
 *
 * ⚠️ Enter bir nechta shaklda kelishi mumkin (`\n`, `\r`, `\r\n`) — skaner
 * modeliga qarab farq qiladi, shuning uchun uchalasi ham tugash deb qabul
 * qilinadi.
 */
export function feedText(prev: HidState | null, text: string, now: number): FeedResult {
  const terminator = text.search(/[\r\n]/);
  if (terminator >= 0) {
    return { state: null, emit: finish(text.slice(0, terminator)) };
  }
  // Bufer ATAYLAB `text` ning o'zi (qo'shilma emas): `TextInput` kumulyativ
  // qiymat beradi, belgilarni qo'shib borish ikki barobar kod hosil qilardi.
  return { state: { buffer: text, lastAt: now }, emit: null };
}

/** Tanaffus tugadimi — terminatorsiz skanerlar uchun. */
export function flushIdle(state: HidState | null, now: number): FeedResult {
  if (!state) return { state: null, emit: null };
  if (now - state.lastAt < HID_IDLE_MS) return { state, emit: null };
  return { state: null, emit: finish(state.buffer) };
}

/**
 * Belgi boshiga tushadigan eng katta vaqt — skaner/odam farqi.
 *
 * Skaner belgilarni ~5–20ms oralig'ida yuboradi, tez yozadigan odam esa
 * ~150ms. 50ms ikkalasining O'RTASIDA va ikkala tomondan ham uzoq — ya'ni
 * chegara tasodifiy emas, keng bo'shliqqa qo'yilgan.
 */
export const MAX_MS_PER_CHAR = 50;

/**
 * Skaner deb hisoblash uchun eng qisqa kod.
 *
 * `validate-scan.ts` dagi 3 dan YUQORI: chakana savdoda 3–5 belgili
 * shtrix-kod amalda uchramaydi (EAN-8 = 8, EAN-13 = 13, ichki kod = 8),
 * lekin tez yozadigan odam 3 belgini 150ms da urib yuborishi mumkin —
 * ya'ni past chegara soxta ishga tushishlar berardi.
 */
export const SCAN_MIN_LENGTH = 6;

/**
 * Matn KLAVIATURADAN emas, SKANERDAN kelganini aniqlaydi.
 *
 * ⚠️ Nima uchun kerak: qurilmada sinov shuni ko'rsatdiki, Android apparat
 * klaviaturasidan kelgan kiritishni ekrandagi BIRINCHI matn maydoniga
 * yo'naltiradi — bizning holatda qidiruv maydoniga. Ko'rinmas maydon uchun
 * fokus talashish o'rniga, qidiruvning o'zi skanerni tanib oladi.
 */
export function isScannerBurst(length: number, elapsedMs: number): boolean {
  if (length < SCAN_MIN_LENGTH || length > MAX_LENGTH) return false;
  return elapsedMs <= length * MAX_MS_PER_CHAR;
}

/**
 * Bitta hodisada qo'shilgan belgilar soni — odam AJRATIB bo'lmaydigan chegara.
 *
 * Odam klaviaturada belgilarni BITTALAB yuboradi; skaner esa butun kodni
 * bir zumda beradi va React Native ularni bitta `onChangeText` ga
 * birlashtiradi. Ya'ni "bir hodisada 4+ belgi" — odam qila olmaydigan narsa
 * (matn joylashdan tashqari) va vaqtga tayanmaydigan ISHONCHLI belgi.
 */
export const HUMAN_MAX_JUMP = 3;

/**
 * Matn AYNI PAYTDA skanerdan kelayotganini bildiradi (kod hali tugamagan).
 *
 * Bu `isScannerBurst` dan farq qiladi: u tugagan kodni baholaydi, bu esa
 * "hozir yozilayotgani skanermi" degan savolga javob beradi — matnni
 * ekranda KO'RSATMASLIK uchun.
 */
export function isBurstInProgress(
  length: number,
  jump: number,
  elapsedMs: number,
): boolean {
  if (jump > HUMAN_MAX_JUMP) return true;
  return length >= SCAN_MIN_LENGTH && elapsedMs <= length * MAX_MS_PER_CHAR;
}

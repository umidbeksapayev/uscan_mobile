/**
 * Kamera kadrlarini takrorlanishdan tozalash — SOF mantiq.
 *
 * MUAMMO (audit P1-4): ilgari `scanner.tsx` da har skandan keyin SOBIT 900ms
 * qulf qo'yilardi. U ikki narsani bir vaqtda qilardi va ikkalasini ham yomon:
 *  - kamera bitta shtrix-kodni sekundiga o'nlab marta o'qishini to'sardi (KERAK)
 *  - lekin BOSHQA mahsulot skanerlanishini ham to'sardi (KERAK EMAS)
 * Natijada kassir uchta bir xil shishani skanerlashi 2.7 soniya olardi.
 *
 * YECHIM: qulf vaqtga emas, KODNING KADRDAN CHIQIShIGA bog'landi.
 *  - boshqa kod → DARHOL qabul (kutish yo'q)
 *  - o'sha kod → faqat kadrda ko'rinmay turgan tanaffusdan keyin
 *
 * Bu jismoniy haqiqatga mos: kod kadrda turgan ekan — bu O'SHA mahsulot;
 * kod yo'qolib qayta paydo bo'lsa — bu YANGI mahsulot (yoki kassir uni
 * ataylab qayta ko'rsatdi).
 */

export interface ScanGate {
  code: string;
  /** Shu kod OXIRGI marta kadrda ko'rilgan vaqt (qabul qilingani emas). */
  seenAt: number;
}

/**
 * Kod "kadrni tark etdi" deb hisoblanadigan tanaffus.
 *
 * 350ms — kamera kadrlar oralig'idan (~33–200ms) ancha yuqori, ya'ni uzluksiz
 * turgan kod hech qachon ikki marta sanalmaydi; odam mahsulotni almashtirish
 * vaqtidan (~500ms+) esa past, ya'ni ataylab qayta ko'rsatish darhol ishlaydi.
 */
export const REARM_GAP_MS = 350;

/**
 * Shu kadrni qabul qilamizmi.
 *
 * ⚠️ Chaqiruvchi `gate` ni HAR kadrda yangilashi shart (qabul qilinmaganida
 * ham) — aks holda "tanaffus" o'lchanmay qoladi va uzluksiz turgan kod
 * takroran qabul qilinaverardi.
 */
export function shouldAcceptScan(code: string, gate: ScanGate | null, now: number): boolean {
  if (!gate) return true;
  if (gate.code !== code) return true; // boshqa mahsulot — kutish yo'q
  return now - gate.seenAt > REARM_GAP_MS;
}

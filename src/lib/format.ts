/**
 * Pul va vazn formatlash — web lib/utils.ts ga MOS.
 * DB pulni DECIMAL "so'm"da saqlaydi (tiyin EMAS), vaznni DECIMAL "kg"da.
 * (Savat summasi F3/F4 da client'da tiyinda yaxlitlanadi — float drift uchun.)
 */

/** Minglik guruh (bo'sh joy): 2450000 -> "2 450 000" */
function group(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Birliksiz minglik guruh (preview/karta/panel uchun): 2450000 -> "2 450 000" */
export function formatNumber(value: number): string {
  return group(value);
}

/** so'm (DECIMAL) -> "2 450 000 so'm" */
export function formatCurrency(amount: number): string {
  return `${group(amount)} so'm`;
}

/** kg (DECIMAL) -> "1.250 kg" yoki "850 gramm" */
export function formatWeight(kg: number): string {
  if (kg >= 1) return `${kg.toFixed(3)} kg`;
  return `${Math.round(kg * 1000)} gramm`;
}

/**
 * Asia/Tashkent ofseti (UTC+5). O'zbekistonda DST yo'q, shuning uchun qat'iy +5
 * yil bo'yi to'g'ri — foydalanuvchi qayerda bo'lishidan qat'i nazar Toshkent
 * vaqtini ko'rsatadi. (Hermes `Intl` timeZone bazasiga bog'lanmaymiz — qurilma
 * va test bir xil natija beradi.)
 */
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** ISO -> Asia/Tashkent bo'yicha (2 xonali) sana qismlari. */
function tashkentParts(iso: string) {
  const t = new Date(new Date(iso).getTime() + TASHKENT_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    day: p(t.getUTCDate()),
    month: p(t.getUTCMonth() + 1),
    year: t.getUTCFullYear(),
    hour: p(t.getUTCHours()),
    minute: p(t.getUTCMinutes()),
  };
}

/** ISO -> "07.06 14:18" (kun.oy soat:daqiqa, Asia/Tashkent). */
export function formatDateTime(iso: string): string {
  const d = tashkentParts(iso);
  return `${d.day}.${d.month} ${d.hour}:${d.minute}`;
}

/** ISO -> "07.06.2026 14:18" (kun.oy.yil soat:daqiqa, Asia/Tashkent). */
export function formatDateTimeFull(iso: string): string {
  const d = tashkentParts(iso);
  return `${d.day}.${d.month}.${d.year} ${d.hour}:${d.minute}`;
}

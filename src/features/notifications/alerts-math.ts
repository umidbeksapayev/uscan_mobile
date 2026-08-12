/**
 * Bildirishnomalar markazi — sof mantiq.
 *
 * Ma'lumot manbaidan (React Query / Zustand) ataylab ajratilgan: qaysi
 * ogohlantirish ko'rsatilishi va qanday tartibda turishi qurilmasiz test
 * qilinadi (loyiha konvensiyasi — `*-math.ts`).
 */

export type AlertKind = "unsynced" | "lowStock" | "debtors";

export interface AlertInput {
  /** Serverga hali yuborilmagan offline sotuvlar soni. */
  unsyncedCount: number;
  /** `quantity <= low_stock_alert` bo'lgan mahsulotlar soni. */
  lowStockCount: number;
  /** Balansi musbat (qarzi bor) mijozlar soni. */
  debtorCount: number;
  /** `manage_debt` ruxsati — bo'lmasa qarz ma'lumoti umuman ko'rsatilmaydi. */
  canManageDebt: boolean;
}

export interface AlertDescriptor {
  kind: AlertKind;
  count: number;
}

/**
 * Ko'rsatiladigan ogohlantirishlar — ustuvorlik tartibida:
 *
 *   1. Yuborilmagan sotuvlar — ma'lumot xavf ostida (telefon sinsa yo'qoladi),
 *      shuning uchun eng tepada.
 *   2. Kam qoldiq — savdo to'xtab qolishi mumkin, lekin shoshilinch emas.
 *   3. Qarzdorlar — ma'lumot uchun; `manage_debt` ruxsatiga bog'langan.
 *
 * Nol sanoqlilar ro'yxatga tushmaydi — bo'sh ro'yxat "hammasi joyida" degani.
 */
export function buildAlerts(input: AlertInput): AlertDescriptor[] {
  const out: AlertDescriptor[] = [];

  if (input.unsyncedCount > 0) {
    out.push({ kind: "unsynced", count: input.unsyncedCount });
  }
  if (input.lowStockCount > 0) {
    out.push({ kind: "lowStock", count: input.lowStockCount });
  }
  if (input.canManageDebt && input.debtorCount > 0) {
    out.push({ kind: "debtors", count: input.debtorCount });
  }

  return out;
}

/**
 * Qo'ng'iroqcha yonidagi sanoq — ogohlantirishlar TURI soni (0–3), ularning
 * yig'indisi EMAS. "12 kam qoldiq + 3 yuborilmagan = 15" degan raqam hech
 * narsa anglatmaydi; "2 ta muammo bor" esa tushunarli.
 */
export function alertBadgeCount(alerts: AlertDescriptor[]): number {
  return alerts.length;
}

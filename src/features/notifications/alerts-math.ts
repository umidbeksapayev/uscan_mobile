/**
 * Bildirishnomalar markazi — sof mantiq.
 *
 * Ma'lumot manbaidan (React Query / Zustand) ataylab ajratilgan: qaysi
 * ogohlantirish ko'rsatilishi va qanday tartibda turishi qurilmasiz test
 * qilinadi (loyiha konvensiyasi — `*-math.ts`).
 */

export type AlertKind =
  | "unsynced"
  | "invites"
  | "lowStock"
  | "debtors"
  | "lossSales"
  | "returnsSpike"
  | "cashShortfall";

export interface AlertInput {
  /** Serverga hali yuborilmagan offline sotuvlar soni. */
  unsyncedCount: number;
  /** Boshqa do'kondan kelgan, hali javob berilmagan takliflar soni — ega
   *  yoki kassir bo'lishidan qat'i nazar (ko'p-do'konli a'zolik). */
  invitesCount: number;
  /** `quantity <= low_stock_alert` bo'lgan mahsulotlar soni. */
  lowStockCount: number;
  /** Balansi musbat (qarzi bor) mijozlar soni. */
  debtorCount: number;
  /** `manage_debt` ruxsati — bo'lmasa qarz ma'lumoti umuman ko'rsatilmaydi. */
  canManageDebt: boolean;
  /** Tan narxdan past sotilgan qatorlar soni (oxirgi 7 kun). */
  lossSalesCount: number;
  /** Bugungi qaytarish soni oxirgi 14 kunlik o'rtachadan sezilarli oshganmi. */
  returnsSpike: boolean;
  /** Sakrash bo'lganda ko'rsatiladigan son. */
  returnsToday: number;
  /** Katta salbiy farqli kassa yopilishlari soni (oxirgi 7 kun). */
  cashShortfallCount: number;
  /** Anomaliya signallari — tan narx/foyda bilan bog'liq, faqat egasi ko'radi. */
  isOwner: boolean;
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
 *   2. Takliflar — kimdir javobingizni kutmoqda; rol/ruxsatdan mustaqil
 *      (`shop_invites`, 044-migratsiya) — ega ham boshqa do'konga kassir
 *      sifatida taklif qilinishi mumkin.
 *   3. Kam qoldiq — savdo to'xtab qolishi mumkin, lekin shoshilinch emas.
 *   4. Qarzdorlar — ma'lumot uchun; `manage_debt` ruxsatiga bog'langan.
 *   5–7. Anomaliyalar (zararli sotuv, qaytarish sakrashi, kassa kamomadi) —
 *      qoidaga asoslangan, `migration 039`. Tan narx/foyda bilan bog'liq,
 *      shuning uchun faqat `isOwner` bo'lsa qo'shiladi.
 *
 * Nol sanoqlilar ro'yxatga tushmaydi — bo'sh ro'yxat "hammasi joyida" degani.
 */
export function buildAlerts(input: AlertInput): AlertDescriptor[] {
  const out: AlertDescriptor[] = [];

  if (input.unsyncedCount > 0) {
    out.push({ kind: "unsynced", count: input.unsyncedCount });
  }
  if (input.invitesCount > 0) {
    out.push({ kind: "invites", count: input.invitesCount });
  }
  if (input.lowStockCount > 0) {
    out.push({ kind: "lowStock", count: input.lowStockCount });
  }
  if (input.canManageDebt && input.debtorCount > 0) {
    out.push({ kind: "debtors", count: input.debtorCount });
  }
  if (input.isOwner && input.lossSalesCount > 0) {
    out.push({ kind: "lossSales", count: input.lossSalesCount });
  }
  if (input.isOwner && input.returnsSpike) {
    out.push({ kind: "returnsSpike", count: input.returnsToday });
  }
  if (input.isOwner && input.cashShortfallCount > 0) {
    out.push({ kind: "cashShortfall", count: input.cashShortfallCount });
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

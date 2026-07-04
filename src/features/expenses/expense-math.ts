/**
 * Xarajat kundaligi — sof funksiyalar va tiplar (migration 031).
 * Xarajatlar FAQAT egasiga ko'rinadi (RLS owner-only) — sof foyda hisobining
 * qismi, kassirga chiqarilmaydi (cost_price qoidasi bilan bir xil mantiq).
 */

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_at: string;
}

/** Kategoriyalar — DB erkin TEXT, bu ro'yxat client konvensiyasi (web bilan umumiy). */
export const EXPENSE_CATEGORIES = [
  { id: "rent", label: "Ijara" },
  { id: "utility", label: "Kommunal" },
  { id: "salary", label: "Ish haqi" },
  { id: "transport", label: "Transport" },
  { id: "other", label: "Boshqa" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["id"];

/** Kategoriya id → o'zbekcha label (noma'lum id → "Boshqa"). */
export function categoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? "Boshqa";
}

/** Xarajatlar yig'indisi — tiyinda yaxlitlangan (float drift yo'q). */
export function expensesTotal(items: { amount: number }[]): number {
  const sum = items.reduce((s, x) => s + x.amount, 0);
  return Math.round(sum * 100) / 100;
}

/** Sof foyda (xarajatlardan keyin) — manfiy bo'lishi mumkin (zarar). */
export function netProfit(salesProfit: number, expenses: number): number {
  return Math.round((salesProfit - expenses) * 100) / 100;
}

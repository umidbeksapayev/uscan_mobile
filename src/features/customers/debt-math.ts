/**
 * Mijoz balansi: qarz (sotuv − to'langan) − keyingi to'lovlar.
 * > 0 = mijoz bizga qarzdor. Tiyinda yaxlitlanadi (float drift yo'q).
 */
export function customerBalance(
  sales: { total_revenue: number; paid_amount: number }[],
  payments: { amount: number }[],
): number {
  const owed = sales.reduce((s, x) => s + (x.total_revenue - x.paid_amount), 0);
  const paid = payments.reduce((s, x) => s + x.amount, 0);
  return Math.round((owed - paid) * 100) / 100;
}

/** Jami qarzlar — faqat MUSBAT balanslar yig'indisi (oldindan to'langanlar hisobga olinmaydi). */
export function debtTotal(customers: { balance: number }[]): number {
  return customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
}

/** Nasiya sotuvida darhol qarzga yoziladigan summa: jami − to'langan (manfiy emas). */
export function debtFromSale(total: number, paid: number): number {
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

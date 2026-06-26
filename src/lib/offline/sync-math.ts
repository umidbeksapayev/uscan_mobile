/**
 * Sotuv sync xatosini klassifikatsiya — SOF funksiya (alohida test qilinadi).
 * 019 migration'iga moslangan:
 *  - inventar konflikt: process_sale_cart `RAISE EXCEPTION 'Yetarli miqdor yo''q…'`
 *    yoki `'Mahsulot topilmadi…'`.
 *  - dublikat client_id = XATO EMAS (019 `duplicate:true` bilan SUCCESS qaytaradi),
 *    shuning uchun "already_done" bu yerda kam ehtimol — mudofaa uchun qoldirilgan.
 */

export type SaleErrorKind = "network" | "conflict" | "already_done" | "unknown";

function message(err: unknown): string {
  if (err instanceof Error) return err.message.toLowerCase();
  if (typeof err === "string") return err.toLowerCase();
  const m = (err as { message?: unknown })?.message;
  return typeof m === "string" ? m.toLowerCase() : "";
}

export function classifySaleError(err: unknown): SaleErrorKind {
  const msg = message(err);

  // Tarmoq / ulanish / auth-token (qayta urinish davom etadi)
  if (
    /failed to fetch|network request failed|network error|fetch failed|timeout|timed out|econn|enotfound|socket|unable to (connect|resolve)|connection|jwt|token|session expired/.test(
      msg,
    )
  ) {
    return "network";
  }

  // Idempotent dublikat xato sifatida kelsa (kam ehtimol — 019 success qaytaradi)
  if (/duplicate|already (exist|recorded|process)|idempot/.test(msg)) {
    return "already_done";
  }

  // Inventar konflikt (019 aniq xabarlari) — qayta urinmaymiz, rollback
  if (/yetarli miqdor yo|yetarli|mahsulot topilmadi|insufficient|out of stock|stock/.test(msg)) {
    return "conflict";
  }

  return "unknown";
}

/** Drain'ni to'xtatish kerakmi (tarmoq → keyinroq qayta urinamiz). */
export function isRecoverableNetwork(err: unknown): boolean {
  return classifySaleError(err) === "network";
}

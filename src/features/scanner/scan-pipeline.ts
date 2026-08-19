import { findProductsByBarcode } from "@/features/sell/lookup";
import { logError } from "@/lib/logger";
import type { Product } from "@/types/database";

import { validateScan } from "./validate-scan";

/**
 * Skanerlash quvuri — MANBADAN MUSTAQIL.
 *
 * Kamera, HID (klaviatura) yoki Bluetooth skaner — hammasi shu yerga kod
 * beradi va bir xil natija oladi. Ilgari bu mantiq `app/scanner.tsx` ichida,
 * UI, navigatsiya va savat bilan aralashib yotardi va HID qo'shish uchun
 * nusxalash kerak bo'lardi.
 *
 * ⚠️ Bu modul SAVATGA TEGMAYDI. U faqat "bu kod nima" degan savolga javob
 * beradi; miqdor mantiqi chaqiruvchida qoladi (spec: skaner mantiqi va savat
 * miqdori mantiqi ajratilsin).
 */

export { validateScan };

export type ScanOutcome =
  | { kind: "invalid"; code: string }
  | { kind: "not-found"; code: string }
  | { kind: "unit"; product: Product }
  | { kind: "weight"; product: Product }
  | { kind: "error"; message: string };

/** Kod → natija. Xato ULOQTIRMAYDI (skaner oqimi to'xtamasligi kerak). */
export async function resolveScan(raw: string, shopId: string): Promise<ScanOutcome> {
  const code = validateScan(raw);
  if (!code) return { kind: "invalid", code: raw };

  try {
    const found = await findProductsByBarcode(code, shopId);
    if (found.length === 0) return { kind: "not-found", code };
    const product = found[0];
    return product.sale_type === "weight"
      ? { kind: "weight", product }
      : { kind: "unit", product };
  } catch (e) {
    logError("scanner.resolve", e);
    return { kind: "error", message: e instanceof Error ? e.message : "Xatolik" };
  }
}

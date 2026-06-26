import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

/** Web deploy manzili — ekvayring endpointlari shu yerda (Payme maxfiy kalitlari serverda). */
const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ??
  ((Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ?? "");

/** Do'kon ekvayring kredensiallariga egami (Supabase RPC). Xato → false. */
export async function acquiringHasCredentials(shopId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("acquiring_has_credentials", { p_shop_id: shopId });
  if (error) return false;
  return data === true;
}

export interface CreateIntentResult {
  intentId: string;
  payUrl: string;
  provider: string;
}

/** To'lov intent yaratish (web backend orqali). amount = so'm (web client bilan bir xil). */
export async function createPaymentIntent(params: {
  shopId: string;
  items: { product_id: string; quantity: number }[];
  amount: number;
  searchMethod: string;
  clientId: string;
}): Promise<CreateIntentResult> {
  if (!WEB_URL) throw new Error("WEB_URL sozlanmagan");
  const res = await fetch(`${WEB_URL}/api/payments/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Intent xatosi: ${res.status}`);
  }
  return (await res.json()) as CreateIntentResult;
}

export interface IntentStatus {
  status: "pending" | "paid" | "canceled" | "timeout";
  finalized: boolean;
}

/** Intent holatini so'rash (polling). */
export async function getIntentStatus(intentId: string): Promise<IntentStatus> {
  if (!WEB_URL) throw new Error("WEB_URL sozlanmagan");
  const res = await fetch(`${WEB_URL}/api/payments/intent/${encodeURIComponent(intentId)}`);
  if (!res.ok) throw new Error(`Status xatosi: ${res.status}`);
  return (await res.json()) as IntentStatus;
}

/** Sotuv yozilgach intentni "yakunlangan" deb belgilaydi (reconciliation). */
export async function markIntentFinalized(intentId: string): Promise<void> {
  const { error } = await supabase.rpc("acquiring_mark_finalized", { p_intent_id: intentId });
  if (error) throw new Error(error.message);
}

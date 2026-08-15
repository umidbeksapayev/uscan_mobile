import { supabase } from "@/lib/supabase";
import type { PaymentStatus, RejectionCode } from "./payment-status";

/** `payments` qatori (045_payments.sql). */
export interface PaymentRow {
  id: string;
  shop_id: string;
  plan_code: string;
  period: "month" | "year";
  months: number;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  receipt_path: string | null;
  receipt_channel: "upload" | "telegram" | null;
  reference: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_code: RejectionCode | null;
  rejection_reason: string | null;
}

/** Admin ro'yxati qatori — do'kon nomi va egasining emaili bilan. */
export interface AdminPaymentRow extends Omit<PaymentRow, "created_by"> {
  shop_name: string;
  owner_email: string | null;
}

/**
 * To'lov niyatini yaratadi (yoki mavjud faolini qaytaradi — duplicate
 * himoyasi serverda). Summa SERVER hisoblaydi: mijoz narx uzatmaydi.
 */
export async function createPayment(
  shopId: string,
  planCode: string,
  period: "month" | "year",
): Promise<PaymentRow> {
  const { data, error } = await supabase.rpc("create_payment", {
    p_shop_id: shopId,
    p_plan_code: planCode,
    p_period: period,
  });
  if (error) throw new Error(error.message);
  return data as PaymentRow;
}

/** Do'konning davom etayotgan to'lovi (yo'q bo'lsa null). */
export async function getActivePayment(shopId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase.rpc("my_active_payment", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  // RPC `payments` turini qaytaradi — qator topilmasa barcha maydonlar null
  // bo'lgan obyekt keladi, shuning uchun `id` bo'yicha tekshiramiz.
  const row = data as PaymentRow | null;
  return row?.id ? row : null;
}

/** Do'konning to'lovlar tarixi (RLS: faqat ega ko'radi). */
export async function listMyPayments(shopId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentRow[];
}

/** Chek yuborildi → `reviewing`. `path` faqat `upload` kanalida beriladi. */
export async function submitReceipt(args: {
  paymentId: string;
  channel: "upload" | "telegram";
  path?: string | null;
  reference?: string | null;
}): Promise<PaymentRow> {
  const { data, error } = await supabase.rpc("submit_payment_receipt", {
    p_payment_id: args.paymentId,
    p_channel: args.channel,
    p_path: args.path ?? null,
    p_reference: args.reference ?? null,
  });
  if (error) throw new Error(error.message);
  return data as PaymentRow;
}

export async function cancelPayment(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_payment", { p_payment_id: paymentId });
  if (error) throw new Error(error.message);
}

/* ─────────────────────────────────────────────────────────────────────────
   Admin (super_admin)
───────────────────────────────────────────────────────────────────────── */

export async function adminListPayments(status?: PaymentStatus): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase.rpc("admin_list_payments", {
    p_status: status ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPaymentRow[];
}

export async function adminReviewPayment(args: {
  paymentId: string;
  approve: boolean;
  rejectionCode?: RejectionCode | null;
  rejectionText?: string | null;
}): Promise<PaymentRow> {
  const { data, error } = await supabase.rpc("admin_review_payment", {
    p_payment_id: args.paymentId,
    p_approve: args.approve,
    p_rejection_code: args.rejectionCode ?? null,
    p_rejection_text: args.rejectionText ?? null,
  });
  if (error) throw new Error(error.message);
  return data as PaymentRow;
}

/**
 * Chekni ko'rish uchun IMZOLANGAN havola (bucket PRIVATE — public URL yo'q).
 * Muddati qisqa: havola tarqalib ketsa ham tez ishlamay qoladi.
 */
export async function getReceiptSignedUrl(path: string, expiresInSec = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Joriy foydalanuvchi super_admin'mi.
 *
 * DB funksiyasining O'ZINI chaqiramiz (`is_super_admin()`, migration 012) —
 * `profiles` jadvalini klientdan o'qish emas. Sabablari: (1) bu gate
 * qilingan RPC'lar ishlatadigan AYNAN shu manba, ya'ni javob har doim mos
 * keladi; (2) `profiles` RLS yoki qo'shimcha `getUser()` tarmoq so'rovi
 * kabi oraliq nuqtalar yo'q — bitta chaqiruv.
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(error.message);
  return data === true;
}

import { supabase } from "@/lib/supabase";
import type { Customer, CustomerWithBalance, CustomerPayment } from "@/types/database";

/** Nasiya ro'yxati: har mijoz + joriy balans (get_customers_with_balance RPC). */
export async function getCustomersWithBalance(shopId: string): Promise<CustomerWithBalance[]> {
  const { data, error } = await supabase.rpc("get_customers_with_balance", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerWithBalance[];
}

export interface CustomerInput {
  shop_id: string;
  name: string;
  phone?: string | null;
  note?: string | null;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: input.shop_id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  fields: Partial<Omit<CustomerInput, "shop_id">>,
): Promise<Customer> {
  const patch: Record<string, unknown> = {};
  if (typeof fields.name === "string") patch.name = fields.name.trim();
  if ("phone" in fields) patch.phone = fields.phone?.trim() || null;
  if ("note" in fields) patch.note = fields.note?.trim() || null;

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

/** Mijoz qarz/sotuv tarixi uchun yengil qator (mahsulotlar ochilmaydi). */
export interface CustomerSaleRow {
  id: string;
  sold_at: string;
  total_revenue: number;
  paid_amount: number;
  item_count: number;
}

export async function getCustomerSales(customerId: string): Promise<CustomerSaleRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, sold_at, total_revenue, paid_amount, item_count")
    .eq("customer_id", customerId)
    .order("sold_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerSaleRow[];
}

export async function getCustomerPayments(customerId: string): Promise<CustomerPayment[]> {
  const { data, error } = await supabase
    .from("customer_payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("paid_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerPayment[];
}

export interface RecordPaymentInput {
  shopId: string;
  customerId: string;
  amount: number;
  note?: string | null;
}

/** Qarz to'lash (record_customer_payment RPC) → yangilangan balans. */
export async function recordPayment(input: RecordPaymentInput): Promise<{ balance: number }> {
  const { data, error } = await supabase.rpc("record_customer_payment", {
    p_shop_id: input.shopId,
    p_customer_id: input.customerId,
    p_amount: input.amount,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { balance: number };
}

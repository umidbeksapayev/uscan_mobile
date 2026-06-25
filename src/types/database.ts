/**
 * Mobil uchun kerakli DB tiplari (web types/database.ts dan kerakli qismi).
 * Fazalar o'sgani sayin kengaytiriladi.
 */

export type MemberRole = "owner" | "cashier";
export type MemberPermissions = Record<string, boolean>;
export type SaleType = "unit" | "weight";
/** Sotuvda mahsulot qanday topilgan: shtrix-kod yoki qo'lda. ('visual' eski yozuvlar.) */
export type SearchMethod = "barcode" | "visual" | "manual";

export interface Shop {
  id: string;
  name: string;
  logo_url?: string | null;
  created_at?: string;
}

export interface Membership {
  shop: Shop;
  role: MemberRole;
  permissions: MemberPermissions;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  created_at?: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  sale_type: SaleType;
  selling_price: number; // so'm (DECIMAL)
  cost_price: number; // so'm — UI'da HECH QACHON ko'rsatilmaydi (maxfiy)
  quantity: number; // unit: dona, weight: kg
  low_stock_alert: number;
  barcode: string | null;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  category?: { name: string } | null;
}

/** Sotuvdagi bitta qator (sale_items). */
export interface SaleItem {
  id: string;
  sale_id: string;
  shop_id: string;
  product_id: string;
  sale_type: SaleType;
  quantity_sold: number;
  cost_price_snapshot: number; // maxfiy — kassir ekraniga chiqarilmaydi
  selling_price_snapshot: number;
  total_revenue: number;
  total_profit: number;
  search_method: SearchMethod;
  sold_at: string;
  product?: Pick<Product, "name" | "image_url" | "sale_type">;
}

/** Sotuvga biriktirilgan qaytarish qisqacha (tarix badge'i uchun). */
export interface SaleReturnSummary {
  id: string;
  total_refund: number;
}

/** Sotuv sarlavhasi (header): bitta sotuv = bitta yozuv, ichida sale_items. */
export interface Sale {
  id: string;
  shop_id: string;
  customer_id: string | null;
  total_revenue: number;
  total_profit: number;
  item_count: number;
  paid_amount: number;
  search_method: SearchMethod;
  sold_at: string;
  items?: SaleItem[];
  returns?: SaleReturnSummary[];
}

/** Qaytarish sarlavhasi (return/refund). */
export interface Return {
  id: string;
  shop_id: string;
  sale_id: string;
  total_refund: number;
  total_profit: number;
  reason: string | null;
  created_at: string;
  items?: ReturnItem[];
}

/** Qaytarilgan qator. */
export interface ReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string;
  shop_id: string;
  sale_id: string;
  quantity: number;
  refund_amount: number;
  profit_amount: number;
  created_at: string;
}

/** Dashboard bugungi ko'rsatkichlari (get_dashboard_stats RPC). */
export interface DashboardStats {
  today_revenue: number;
  today_profit: number;
  today_sales_count: number;
  low_stock_count: number;
}

/** Kunlik trend nuqtasi (get_sales_trend RPC). */
export interface SalesTrendPoint {
  day: string; // "YYYY-MM-DD"
  revenue: number;
  profit: number;
  sales_count: number;
}

/** Eng ko'p / eng kam sotilgan mahsulot (get_top_products / get_slow_products RPC). */
export interface TopProduct {
  product_id: string;
  name: string;
  image_url: string | null;
  sale_type: SaleType;
  units_sold: number;
  revenue: number;
  profit: number;
}

/** Ombor qiymati (get_inventory_stats RPC). cost_* faqat view_cost'da (aks holda null). */
export interface InventoryStats {
  product_count: number;
  total_unit_qty: number;
  total_weight_kg: number;
  retail_value: number;
  cost_value: number | null;
  potential_profit: number | null;
  low_stock_count: number;
  out_of_stock_count: number;
  can_view_cost: boolean;
}

/** Davr savdo statistikasi (get_sales_stats RPC). profit faqat view_cost'da (null). */
export interface SalesStats {
  revenue: number;
  sales_count: number;
  avg_check: number;
  profit: number | null;
  prev_revenue: number;
  prev_sales_count: number;
  prev_profit: number | null;
  can_view_cost: boolean;
}

/** Nasiya mijozi. */
export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
}

/** Mijoz + joriy qarz balansi (get_customers_with_balance RPC).
 *  balance > 0 = mijoz bizga qarzdor. */
export interface CustomerWithBalance {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
  balance: number;
}

/** Mijoz to'lovi (qarz to'lash). */
export interface CustomerPayment {
  id: string;
  shop_id: string;
  customer_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
}

/**
 * Mobil uchun kerakli DB tiplari (web types/database.ts dan kerakli qismi).
 * Fazalar o'sgani sayin kengaytiriladi.
 */

export type MemberRole = "owner" | "cashier";
export type MemberPermissions = Record<string, boolean>;
export type SaleType = "unit" | "weight";

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

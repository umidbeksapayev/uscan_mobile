/**
 * Mobil uchun kerakli DB tiplari (web types/database.ts dan kerakli qismi).
 * Fazalar o'sgani sayin bu fayl kengaytiriladi.
 */

export type MemberRole = "owner" | "cashier";
export type MemberPermissions = Record<string, boolean>;

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

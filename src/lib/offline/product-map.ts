import type { Product, SaleType } from "@/types/database";

/**
 * Mahsulot ↔ kesh qatori map'lari (SOF funksiyalar — native importsiz, test
 * qilinadi). ⚠️ `cost_price` (maxfiy) keshga YOZILMAYDI / O'QILMAYDI.
 */
export interface ProductRow {
  id: string;
  shop_id: string;
  name: string;
  sale_type: string;
  selling_price: number;
  quantity: number;
  barcode: string | null;
  category_id: string | null;
  is_active: number; // 0 | 1
  image_url: string | null;
  category_name: string | null;
  server_updated_at: string;
  local_updated_at: string;
}

/** Supabase join'idan kategoriya nomini ajratish (obyekt yoki massiv bo'lishi mumkin). */
export function categoryName(raw: unknown): string | null {
  const c = (raw as { category?: { name?: string } | { name?: string }[] | null })?.category;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.name ?? null;
  return c.name ?? null;
}

/** Server mahsulotini kesh qatoriga map qiladi. cost_price O'QILMAYDI/yozilmaydi. */
export function productToRow(p: Record<string, unknown>, nowISO: string): ProductRow {
  return {
    id: String(p.id),
    shop_id: String(p.shop_id),
    name: String(p.name ?? ""),
    sale_type: String(p.sale_type ?? "unit"),
    selling_price: Number(p.selling_price ?? 0),
    quantity: Number(p.quantity ?? 0),
    barcode: (p.barcode as string) ?? null,
    category_id: (p.category_id as string) ?? null,
    is_active: p.is_active === false ? 0 : 1,
    image_url: (p.image_url as string) ?? null,
    category_name: categoryName(p),
    server_updated_at: String(p.created_at ?? nowISO),
    local_updated_at: nowISO,
  };
}

/** Kesh qatorini Product'ga. cost_price=0, low_stock_alert=0 (UI ishlatmaydi). */
export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    sale_type: r.sale_type as SaleType,
    selling_price: r.selling_price,
    cost_price: 0, // maxfiy — keshda yo'q
    quantity: r.quantity,
    low_stock_alert: 0,
    barcode: r.barcode,
    image_url: r.image_url,
    category_id: r.category_id,
    is_active: r.is_active === 1,
    created_at: r.server_updated_at,
    category: r.category_name ? { name: r.category_name } : null,
  };
}

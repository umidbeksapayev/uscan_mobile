import { supabase } from "@/lib/supabase";
import { normalizeBarcode } from "@/lib/barcode";
import type { Product, SaleType } from "@/types/database";

export interface ProductInput {
  shop_id: string;
  name: string;
  sale_type: SaleType;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_alert: number;
  barcode?: string | null;
  category_id?: string | null;
  image_url?: string | null;
}

/** Yangi mahsulot (web lib/products.ts createProduct ga mos). */
export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      shop_id: input.shop_id,
      name: input.name.trim(),
      sale_type: input.sale_type,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      quantity: input.quantity,
      low_stock_alert: input.low_stock_alert,
      barcode: input.barcode ? normalizeBarcode(input.barcode) : null,
      image_url: input.image_url ?? null,
      category_id: input.category_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Product;
}

/** Mahsulotni tahrirlash. */
export async function updateProduct(
  id: string,
  fields: Partial<Omit<ProductInput, "shop_id">>,
): Promise<Product> {
  const patch: Record<string, unknown> = { ...fields };
  if (typeof patch.name === "string") patch.name = patch.name.trim();
  if ("barcode" in patch) {
    patch.barcode = patch.barcode ? normalizeBarcode(patch.barcode as string) : null;
  }
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Product;
}

/** Bitta mahsulot (tahrirlash uchun). */
export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as Product;
}

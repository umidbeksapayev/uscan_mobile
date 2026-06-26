import { supabase } from "@/lib/supabase";
import { escapeLike } from "@/lib/escape-like";
import type { Product } from "@/types/database";
import { getAllAsync, runAsync, withTransaction } from "./db";
import { meta, MetaKeys } from "./mmkv";
import { type ProductRow, productToRow, rowToProduct } from "./product-map";

export { type ProductRow, productToRow, rowToProduct } from "./product-map";

/**
 * Offline mahsulot keshi. ⚠️ `cost_price` (tan narxi) HECH QACHON saqlanmaydi —
 * offline sotuvda kerak emas (RPC serverda cost_price_snapshot oladi).
 *
 * ⚠️ `products` jadvalida `updated_at` YO'Q (faqat created_at) → delta-sync
 * imkonsiz. Shuning uchun TO'LIQ sync: server avtoritativ. Reconnect'da AVVAL
 * navbat drenaj qilinadi, KEYIN katalog sync — optimistik qoldiq konflikti yo'q.
 */

/** Server fetch ustunlari — cost_price ATALYABDAN yo'q (web CATALOG_COLUMNS mos). */
const SYNC_COLUMNS =
  "id, shop_id, name, sale_type, selling_price, quantity, barcode, image_url, category_id, is_active, created_at, category:categories(name)";

const SYNC_BATCH = 500;

const UPSERT_SQL = `INSERT INTO products_cache
  (id, shop_id, name, sale_type, selling_price, quantity, barcode, category_id, is_active, image_url, category_name, server_updated_at, local_updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    shop_id=excluded.shop_id, name=excluded.name, sale_type=excluded.sale_type,
    selling_price=excluded.selling_price, quantity=excluded.quantity, barcode=excluded.barcode,
    category_id=excluded.category_id, is_active=excluded.is_active, image_url=excluded.image_url,
    category_name=excluded.category_name, server_updated_at=excluded.server_updated_at,
    local_updated_at=excluded.local_updated_at`;

function rowParams(r: ProductRow): (string | number | null)[] {
  return [
    r.id, r.shop_id, r.name, r.sale_type, r.selling_price, r.quantity, r.barcode,
    r.category_id, r.is_active, r.image_url, r.category_name, r.server_updated_at, r.local_updated_at,
  ];
}

/** Qisman upsert (online lookup keshini yangilash uchun) — boshqalarni o'chirmaydi. */
export async function upsertProducts(products: Record<string, unknown>[]): Promise<void> {
  if (products.length === 0) return;
  const now = new Date().toISOString();
  const rows = products.map((p) => productToRow(p, now));
  await withTransaction(async (db) => {
    for (const r of rows) {
      await db.runAsync(UPSERT_SQL, rowParams(r));
    }
  });
}

export async function searchByName(shopId: string, term: string): Promise<Product[]> {
  const t = term.trim();
  if (!t) return [];
  const like = `%${escapeLike(t)}%`;
  const rows = await getAllAsync<ProductRow>(
    `SELECT * FROM products_cache
     WHERE shop_id=? AND is_active=1 AND quantity>0 AND name LIKE ? ESCAPE '\\'
     ORDER BY name LIMIT 10`,
    [shopId, like],
  );
  return rows.map(rowToProduct);
}

export async function findByBarcode(shopId: string, variants: string[]): Promise<Product[]> {
  if (variants.length === 0) return [];
  const placeholders = variants.map(() => "?").join(",");
  const rows = await getAllAsync<ProductRow>(
    `SELECT * FROM products_cache
     WHERE shop_id=? AND barcode IN (${placeholders}) AND is_active=1 AND quantity>0
     ORDER BY local_updated_at DESC LIMIT 3`,
    [shopId, ...variants],
  );
  return rows.map(rowToProduct);
}

/** Optimistik qoldiq kamaytirish (0 dan past tushmaydi). */
export async function decrementLocalQty(shopId: string, productId: string, qty: number): Promise<void> {
  await runAsync(
    `UPDATE products_cache SET quantity = MAX(0, quantity - ?), local_updated_at = ?
     WHERE shop_id=? AND id=?`,
    [qty, new Date().toISOString(), shopId, productId],
  );
}

/** Rollback (konflikt bo'lganda optimistik kamaytirishni qaytarish). */
export async function incrementLocalQty(shopId: string, productId: string, qty: number): Promise<void> {
  await runAsync(
    `UPDATE products_cache SET quantity = quantity + ?, local_updated_at = ?
     WHERE shop_id=? AND id=?`,
    [qty, new Date().toISOString(), shopId, productId],
  );
}

export async function markInactive(shopId: string, productId: string): Promise<void> {
  await runAsync(
    `UPDATE products_cache SET is_active=0, local_updated_at=? WHERE shop_id=? AND id=?`,
    [new Date().toISOString(), shopId, productId],
  );
}

/**
 * Serverdan TO'LIQ sync (server avtoritativ). Tranzaksiyada: avval do'kon
 * mahsulotlari inaktiv qilinadi, keyin server faollarini upsert (is_active=1) —
 * shu bilan o'chirilgan/inaktiv mahsulotlar lokal'da ham inaktiv bo'ladi.
 * ⚠️ Faqat navbat BO'SH bo'lганда chaqiring (use-sync orkestratsiyasi).
 */
export async function syncProductsFromServer(shopId: string): Promise<number> {
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += SYNC_BATCH) {
    const { data, error } = await supabase
      .from("products")
      .select(SYNC_COLUMNS)
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, from + SYNC_BATCH - 1);
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...chunk);
    if (chunk.length < SYNC_BATCH) break;
  }

  const now = new Date().toISOString();
  const rows = all.map((p) => productToRow(p, now));
  await withTransaction(async (db) => {
    await db.runAsync(`UPDATE products_cache SET is_active=0 WHERE shop_id=?`, [shopId]);
    for (const r of rows) {
      await db.runAsync(UPSERT_SQL, rowParams(r));
    }
  });
  meta.setString(MetaKeys.lastProductSyncAt, now);
  return rows.length;
}

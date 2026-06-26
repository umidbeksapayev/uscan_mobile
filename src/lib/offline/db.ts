import * as SQLite from "expo-sqlite";

/**
 * Offline SQLite — mahsulot keshi + sotuv navbati (app-lokal, jonli DB EMAS).
 * Singleton handle + ready-promise: bir nechta importда bir xil ulanish.
 * Init muvaffaqiyatsiz bo'lsa app yiqilmaydi — chaqiruvchilar try/catch bilan
 * online rejimga qaytadi (graceful degrade).
 */
const DB_NAME = "uscan.db";
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products_cache (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sale_type TEXT NOT NULL,
        selling_price REAL NOT NULL,
        quantity REAL NOT NULL,
        barcode TEXT,
        category_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        image_url TEXT,
        category_name TEXT,
        server_updated_at TEXT NOT NULL,
        local_updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pc_barcode ON products_cache(shop_id, barcode);
      CREATE INDEX IF NOT EXISTS idx_pc_name ON products_cache(shop_id, name);
      CREATE INDEX IF NOT EXISTS idx_pc_category ON products_cache(shop_id, category_id);

      CREATE TABLE IF NOT EXISTS sale_queue (
        client_id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        items_json TEXT NOT NULL,
        customer_id TEXT,
        paid_amount REAL,
        method TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        attempt INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sq_status ON sale_queue(shop_id, status);

      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  }
}

/** SQLite handle (lazy, singleton). Init xato bo'lsa promise tozalanadi → retry. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME)
      .then(async (db) => {
        await db.execAsync("PRAGMA journal_mode = WAL");
        await migrate(db);
        return db;
      })
      .catch((e) => {
        dbPromise = null;
        throw e;
      });
  }
  return dbPromise;
}

export async function runAsync(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<SQLite.SQLiteRunResult> {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function getAllAsync<T>(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

/** Bir nechta yozuvni bitta tranzaksiyada bajarish (batch upsert uchun). */
export async function withTransaction(fn: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await fn(db);
  });
}

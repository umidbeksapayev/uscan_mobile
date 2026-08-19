import * as SQLite from "expo-sqlite";

import { withTimeout } from "@/lib/with-timeout";

/**
 * Offline SQLite — mahsulot keshi + sotuv navbati (app-lokal, jonli DB EMAS).
 * Singleton handle + ready-promise: bir nechta importда bir xil ulanish.
 * Init muvaffaqiyatsiz bo'lsa app yiqilmaydi — chaqiruvchilar try/catch bilan
 * online rejimga qaytadi (graceful degrade).
 */
const DB_NAME = "uscan.db";

/*
  Sxema versiyasi HAR MIGRATSIYA BLOKI ichida yoziladi (`PRAGMA user_version`),
  bitta umumiy konstantada emas. Sabab: blok yarmida uzilsa (ilova yopildi,
  qurilma o'chdi) umumiy konstanta bilan versiya yozilmay qolib, keyingi
  ishga tushishda hamma bloklar qaytadan bajarilardi. Har blok o'z versiyasini
  o'zi tasdiqlaydi — bosqichma-bosqich va uzilishga chidamli.
*/

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

      PRAGMA user_version = 1;
    `);
  }
  if (version < 2) {
    // Chop etish navbati (B2). `sale_queue` bilan bir xil naqsh: idempotency
    // kaliti PRIMARY KEY, urinish sanog'i va xato matni qatorda.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS print_queue (
        job_id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        target_kind TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        error_kind TEXT,
        attempt INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pq_status ON print_queue(shop_id, status);

      PRAGMA user_version = 2;
    `);
  }
}

/**
 * Native handle o'lganini bildiruvchi xato.
 *
 * Qurilmada kuzatilgan: `NativeDatabase.execAsync ... java.lang.NullPointerException`.
 * Bunda JS tomonda keshlangan promise TIRIK, lekin u ko'rsatayotgan native
 * baza YOPILGAN — natijada HAR BIR so'rov shu xato bilan tugaydi va ilova
 * qayta ochilmaguncha tuzalmaydi.
 *
 * Ishlab chiqishda buni Fast Refresh keltirib chiqaradi, lekin xavf
 * PRODUCTIONDA ham bor (OS resursni qaytarib olishi mumkin) — va oqibati
 * jiddiy: offline sotuv navbati JIMGINA ishlamay qoladi.
 */
function isDeadHandleError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e);
  return /NullPointerException|has been rejected|database is closed|closed database|null pointer/i.test(
    msg,
  );
}

/**
 * Bitta DB amali uchun eng ko'p kutish vaqti.
 *
 * ⚠️ MUHIM: bu `lib/with-timeout.ts` bilan bir xil naqsh — o'sha faylda
 * aynan shu turdagi xavf hujjatlashtirilgan (GoTrueClient RN'da abadiy
 * osilib qolishi). SQLite handle uchun ham xuddi shu xavf bor: agar native
 * ulanish "o'lik" holatda qolsa-yu buni ANIQ xato sifatida qaytarmasa
 * (osilib qoladi, na resolve na reject), `decrementLocalQty` kabi chaqiruv
 * ABADIY kutadi — bu esa `submitSale()` ni, demak TO'LOV tugmasini ham
 * abadiy "yuklanmoqda" holatida ushlab qoladi. Timeout shu zanjirni uzadi:
 * sotuv printerga BOG'LIQ BO'LMASLIGI kerak bo'lgani kabi, DB holatiga ham
 * ABADIY bog'liq bo'lib qolmasligi kerak.
 */
const DB_OP_TIMEOUT_MS = 8000;

/** O'lik handle'ni yopishga urinadi (xato yutiladi — allaqachon o'lik). */
async function tryClose(db: SQLite.SQLiteDatabase | null): Promise<void> {
  if (!db) return;
  try {
    await withTimeout(db.closeAsync(), 2000, "closeAsync timeout");
  } catch {
    // Yopib bo'lmadi — baribir yangi ulanish ochamiz. Eski handle allaqachon
    // ishlamay turgani uchun bu yerda yo'qotadigan narsa yo'q.
  }
}

/**
 * DB amalini TIMEOUT bilan bajaradi; handle o'lgan bo'lsa BIR MARTA qayta
 * ochib takrorlaydi.
 *
 * ⚠️ Faqat bir marta qayta urinish: cheksiz qayta urinish haqiqiy SQL
 * xatosini (masalan buzilgan so'rov) yashirib, ilovani halqaga tushirardi.
 */
async function withDb<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDb();
  try {
    return await withTimeout(fn(db), DB_OP_TIMEOUT_MS, "sqlite timeout");
  } catch (e) {
    if (!isDeadHandleError(e)) throw e;
    // Eski (o'lik) ulanishni yopishga urinamiz — aks holda u qulf
    // ushlab turishi mumkin va YANGI ulanish ham osilib qolardi
    // (aynan shu holat uchun tashqi timeout ham qo'yilgan — ikki qatlamli
    // himoya).
    await tryClose(db);
    dbPromise = null; // keshni tashlaymiz -> keyingi getDb() yangi ulanish ochadi
    const fresh = await getDb();
    return withTimeout(fn(fresh), DB_OP_TIMEOUT_MS, "sqlite timeout");
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

export function runAsync(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<SQLite.SQLiteRunResult> {
  return withDb((db) => db.runAsync(sql, params));
}

export function getAllAsync<T>(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<T[]> {
  return withDb((db) => db.getAllAsync<T>(sql, params));
}

/** Bir nechta yozuvni bitta tranzaksiyada bajarish (batch upsert uchun). */
export function withTransaction(
  fn: (db: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<void> {
  return withDb((db) =>
    db.withTransactionAsync(async () => {
      await fn(db);
    }),
  );
}

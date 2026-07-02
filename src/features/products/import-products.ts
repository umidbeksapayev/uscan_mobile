import type { SaleType } from "@/types/database";
import { normalizeBarcode } from "@/lib/barcode";
import { lowStockThreshold } from "./low-stock";

/**
 * Ommaviy import — sof (framework'siz) yadro: CSV parsing, ustun aniqlash,
 * raqam/tur parsing, qator validatsiyasi va dedupe. Web `lib/import-products.ts`
 * bilan bir xil mantiq (portlangan) — `import_products` RPC ikkalasida ham bir xil
 * (migration 018/024, shared backend, mobile uchun yangi migratsiya kerak emas).
 * Fiskal (mxik/vat) maydonlari mobile'da hozircha yo'q — RPC ularsiz ham ishlaydi.
 */

export type ImportField = "name" | "type" | "cost" | "selling" | "quantity" | "barcode" | "category";

const HEADER_ALIASES: Record<ImportField, string[]> = {
  name: ["nomi", "nom", "mahsulot", "tovar", "name", "product", "название", "товар"],
  type: ["tur", "turi", "birlik", "type", "sale_type", "тип", "единица"],
  cost: [
    "tan narxi", "tannarxi", "tan narx", "kirim narxi", "cost", "cost_price",
    "себестоимость", "закуп", "закупка", "закупочная",
  ],
  selling: [
    "sotish narxi", "sotuv narxi", "narxi", "narx", "sotish", "price", "selling",
    "selling_price", "цена", "продажная", "продажа",
  ],
  quantity: [
    "miqdor", "miqdori", "soni", "zaxira", "qoldiq", "qty", "quantity",
    "количество", "кол-во", "остаток",
  ],
  barcode: ["barcode", "barkod", "shtrix", "shtrix kod", "штрих", "штрихкод", "штрих-код"],
  category: ["kategoriya", "guruh", "bo'lim", "bolim", "category", "категория", "группа"],
};

/** Sarlavha katakchasini solishtirish uchun normalizatsiya. */
function normHeader(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[\s ]+/g, " ")
    .trim();
}

export type ColumnMap = Record<ImportField, number>;

/** Sarlavha qatoridan har bir maydon uchun ustun indeksini topadi (-1 = yo'q). */
export function detectColumns(headerRow: string[]): ColumnMap {
  const normalized = headerRow.map(normHeader);
  const map = {} as ColumnMap;
  (Object.keys(HEADER_ALIASES) as ImportField[]).forEach((field) => {
    map[field] = normalized.findIndex((h) => h !== "" && HEADER_ALIASES[field].includes(h));
  });
  return map;
}

// ============================================================
// Raqam parsing — "12 000", "12,5", "1,234.56", "1.234,56" formatlar
// ============================================================
export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[\s ]/g, ""); // mingliklar ajratuvchisi (bo'sh joy)

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(/,/g, ".");
  }
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ============================================================
// Sotuv turi parsing (dona / kg sinonimlar)
// ============================================================
const UNIT_WORDS = new Set(["unit", "dona", "ta", "pcs", "piece", "шт", "штук", "штука"]);
const WEIGHT_WORDS = new Set(["weight", "kg", "kilo", "kilogram", "vazn", "вес", "кг"]);

/** Bo'sh/yo'q → 'unit' (default). Tanilmagan qiymat → null (xato). */
export function parseSaleType(raw: unknown): SaleType | null {
  const s = String(raw ?? "").toLowerCase().trim();
  if (!s) return "unit";
  if (UNIT_WORDS.has(s)) return "unit";
  if (WEIGHT_WORDS.has(s)) return "weight";
  return null;
}

// ============================================================
// CSV parsing (vergul yoki nuqta-vergul ajratuvchi, qo'shtirnoq qo'llab-quvvatlash)
// ============================================================
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  const tab = (firstLine.match(/\t/g) ?? []).length;
  if (tab > semi && tab > comma) return "\t";
  return semi > comma ? ";" : ",";
}

/** CSV matnini 2 o'lchamli massivga (qatorlar × ustunlar) aylantiradi. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const delim = detectDelimiter(clean);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (ch === "\r") {
      // \r\n — \n da boshqariladi
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

// ============================================================
// Qator validatsiyasi + preview
// ============================================================
export type ImportRowStatus = "valid" | "error" | "duplicate";

export interface ImportPreviewRow {
  rowNumber: number; // 1-asosli ma'lumot qatori (sarlavhasiz)
  name: string;
  status: ImportRowStatus;
  errors: string[];
  saleType: SaleType;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  barcode: string | null;
  category: string | null;
}

export interface ImportPreviewResult {
  headerError: boolean;
  columns: ColumnMap;
  rows: ImportPreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
}

function cell(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? String(row[idx] ?? "").trim() : "";
}

/**
 * Grid (1-qator = sarlavha) → tekshirilgan preview qatorlari.
 * @param existingBarcodes - DB'da allaqachon mavjud barcode'lar (dublikat belgilash uchun)
 */
export function buildPreview(
  grid: string[][],
  opts?: { existingBarcodes?: Set<string> },
): ImportPreviewResult {
  const empty: ImportPreviewResult = {
    headerError: true,
    columns: detectColumns([]),
    rows: [],
    validCount: 0,
    errorCount: 0,
    duplicateCount: 0,
  };
  if (!grid || grid.length === 0) return empty;

  const columns = detectColumns(grid[0]);
  const headerError =
    columns.name < 0 || columns.cost < 0 || columns.selling < 0 || columns.quantity < 0;
  if (headerError) return { ...empty, columns };

  const existing = opts?.existingBarcodes ?? new Set<string>();
  const seen = new Set<string>();
  const rows: ImportPreviewRow[] = [];

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r];
    const errors: string[] = [];

    const name = cell(raw, columns.name);
    if (!name) errors.push("name_required");

    const saleType = parseSaleType(cell(raw, columns.type));
    if (saleType === null) errors.push("invalid_type");

    const cost = parseNumber(cell(raw, columns.cost));
    if (cost === null || cost < 0) errors.push("invalid_cost");

    const selling = parseNumber(cell(raw, columns.selling));
    if (selling === null || selling <= 0) errors.push("invalid_selling");

    const qty = parseNumber(cell(raw, columns.quantity));
    if (qty === null || qty < 0) {
      errors.push("invalid_quantity");
    } else if ((saleType ?? "unit") === "unit" && !Number.isInteger(qty)) {
      errors.push("unit_not_integer");
    }

    const barcodeRaw = cell(raw, columns.barcode);
    const barcode = barcodeRaw ? normalizeBarcode(barcodeRaw) || null : null;
    const category = cell(raw, columns.category) || null;

    let status: ImportRowStatus = errors.length > 0 ? "error" : "valid";
    if (status === "valid" && barcode) {
      if (existing.has(barcode) || seen.has(barcode)) {
        status = "duplicate";
      } else {
        seen.add(barcode);
      }
    }

    rows.push({
      rowNumber: r,
      name,
      status,
      errors,
      saleType: saleType ?? "unit",
      costPrice: cost ?? 0,
      sellingPrice: selling ?? 0,
      quantity: qty ?? 0,
      barcode,
      category,
    });
  }

  return {
    headerError: false,
    columns,
    rows,
    validCount: rows.filter((r) => r.status === "valid").length,
    errorCount: rows.filter((r) => r.status === "error").length,
    duplicateCount: rows.filter((r) => r.status === "duplicate").length,
  };
}

// ============================================================
// RPC payload (faqat 'valid' qatorlar; low_stock_alert avtomatik 20%)
// ============================================================
export interface ImportPayloadRow {
  name: string;
  sale_type: SaleType;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_alert: number;
  barcode: string | null;
  category: string | null;
}

export function toImportPayload(rows: ImportPreviewRow[]): ImportPayloadRow[] {
  return rows
    .filter((r) => r.status === "valid")
    .map((r) => ({
      name: r.name,
      sale_type: r.saleType,
      cost_price: r.costPrice,
      selling_price: r.sellingPrice,
      quantity: r.quantity,
      low_stock_alert: lowStockThreshold(r.quantity, r.saleType),
      barcode: r.barcode,
      category: r.category,
    }));
}

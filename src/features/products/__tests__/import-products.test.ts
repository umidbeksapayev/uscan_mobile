import {
  parseNumber,
  parseSaleType,
  parseCsv,
  detectColumns,
  buildPreview,
  toImportPayload,
} from "../import-products";

describe("parseNumber", () => {
  it("oddiy butun va kasr", () => {
    expect(parseNumber("12000")).toBe(12000);
    expect(parseNumber("12000.5")).toBe(12000.5);
    expect(parseNumber(7000)).toBe(7000);
  });

  it("bo'sh joy = minglik ajratuvchi", () => {
    expect(parseNumber("12 000")).toBe(12000);
    expect(parseNumber("1 234 567")).toBe(1234567);
  });

  it("vergul = kasr ajratuvchi (rus/uz Excel)", () => {
    expect(parseNumber("12,5")).toBe(12.5);
  });

  it("US format: vergul minglik, nuqta kasr", () => {
    expect(parseNumber("1,234.56")).toBe(1234.56);
  });

  it("EU format: nuqta minglik, vergul kasr", () => {
    expect(parseNumber("1.234,56")).toBe(1234.56);
  });

  it("yaroqsiz → null", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
});

describe("parseSaleType", () => {
  it("dona sinonimlari → unit", () => {
    for (const v of ["dona", "DONA", "ta", "pcs", "unit", "шт"]) {
      expect(parseSaleType(v)).toBe("unit");
    }
  });

  it("kg sinonimlari → weight", () => {
    for (const v of ["kg", "KG", "kilo", "vazn", "кг", "вес"]) {
      expect(parseSaleType(v)).toBe("weight");
    }
  });

  it("bo'sh → unit (default)", () => {
    expect(parseSaleType("")).toBe("unit");
    expect(parseSaleType(null)).toBe("unit");
  });

  it("tanilmagan → null", () => {
    expect(parseSaleType("liter")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("vergul ajratuvchi + sarlavha", () => {
    const grid = parseCsv("Nomi,Tur,Narx\nCola,dona,9000");
    expect(grid).toEqual([
      ["Nomi", "Tur", "Narx"],
      ["Cola", "dona", "9000"],
    ]);
  });

  it("nuqta-vergul ajratuvchi (rus Excel)", () => {
    const grid = parseCsv("Nomi;Tur;Narx\nCola;dona;9000");
    expect(grid[1]).toEqual(["Cola", "dona", "9000"]);
  });

  it("qo'shtirnoq ichida vergul va qator", () => {
    const grid = parseCsv('Nomi,Izoh\n"Cola, 1L","ikki\nqator"');
    expect(grid[1]).toEqual(["Cola, 1L", "ikki\nqator"]);
  });

  it("ikkilangan qo'shtirnoq = bitta", () => {
    const grid = parseCsv('Nomi\n"12""dyuym"');
    expect(grid[1]).toEqual(['12"dyuym']);
  });

  it("bo'sh qatorlarni tashlaydi va BOM ni olib tashlaydi", () => {
    const grid = parseCsv("﻿Nomi\nCola\n\n");
    expect(grid).toEqual([["Nomi"], ["Cola"]]);
  });
});

describe("detectColumns", () => {
  it("uch tildagi sarlavhalarni topadi (* va registr farqsiz)", () => {
    const cols = detectColumns([
      "Nomi*", "Tur", "Tan narxi*", "Sotish narxi*", "Miqdor*", "Barcode", "Kategoriya",
    ]);
    expect(cols.name).toBe(0);
    expect(cols.type).toBe(1);
    expect(cols.cost).toBe(2);
    expect(cols.selling).toBe(3);
    expect(cols.quantity).toBe(4);
    expect(cols.barcode).toBe(5);
    expect(cols.category).toBe(6);
  });

  it("topilmagan ustun → -1", () => {
    const cols = detectColumns(["Nomi", "Narx"]);
    expect(cols.quantity).toBe(-1);
  });
});

describe("buildPreview", () => {
  const header = ["Nomi", "Tur", "Tan narxi", "Sotish narxi", "Miqdor", "Barcode", "Kategoriya"];

  it("majburiy ustun yo'q → headerError", () => {
    const res = buildPreview([["Nomi", "Narx"], ["Cola", "9000"]]);
    expect(res.headerError).toBe(true);
    expect(res.rows).toHaveLength(0);
  });

  it("yaroqli qatorni parslaydi", () => {
    const res = buildPreview([
      header,
      ["Cola 1L", "dona", "7000", "9000", "24", "5449000000996", "Ichimliklar"],
    ]);
    expect(res.headerError).toBe(false);
    expect(res.validCount).toBe(1);
    const row = res.rows[0];
    expect(row.status).toBe("valid");
    expect(row.saleType).toBe("unit");
    expect(row.costPrice).toBe(7000);
    expect(row.sellingPrice).toBe(9000);
    expect(row.quantity).toBe(24);
    expect(row.barcode).toBe("5449000000996");
    expect(row.category).toBe("Ichimliklar");
  });

  it("nom yo'q / narx yo'q → error kodlari", () => {
    const res = buildPreview([header, ["", "dona", "0", "0", "24", "", ""]]);
    expect(res.errorCount).toBe(1);
    expect(res.rows[0].errors).toContain("name_required");
    expect(res.rows[0].errors).toContain("invalid_selling");
  });

  it("donali mahsulot kasr miqdor → unit_not_integer", () => {
    const res = buildPreview([header, ["Cola", "dona", "7000", "9000", "2.5", "", ""]]);
    expect(res.rows[0].errors).toContain("unit_not_integer");
  });

  it("kg mahsulot kasr miqdorga ruxsat", () => {
    const res = buildPreview([header, ["Shakar", "kg", "9000", "11000", "2.5", "", ""]]);
    expect(res.rows[0].status).toBe("valid");
  });

  it("Tur bo'sh → default dona (unit)", () => {
    const res = buildPreview([header, ["Non", "", "1000", "1500", "10", "", ""]]);
    expect(res.rows[0].status).toBe("valid");
    expect(res.rows[0].saleType).toBe("unit");
  });

  it("fayl ichidagi barcode dublikati → duplicate (2-chisi)", () => {
    const res = buildPreview([
      header,
      ["A", "dona", "1000", "1500", "5", "111", ""],
      ["B", "dona", "1000", "1500", "5", "111", ""],
    ]);
    expect(res.rows[0].status).toBe("valid");
    expect(res.rows[1].status).toBe("duplicate");
    expect(res.duplicateCount).toBe(1);
  });

  it("DB'da mavjud barcode → duplicate", () => {
    const res = buildPreview([header, ["A", "dona", "1000", "1500", "5", "999", ""]], {
      existingBarcodes: new Set(["999"]),
    });
    expect(res.rows[0].status).toBe("duplicate");
  });
});

describe("toImportPayload", () => {
  const header = ["Nomi", "Tur", "Tan narxi", "Sotish narxi", "Miqdor"];

  it("faqat valid qatorlar + low_stock_alert (20%) avtomatik", () => {
    const res = buildPreview([
      header,
      ["Cola", "dona", "7000", "9000", "100"],
      ["", "dona", "7000", "9000", "10"],
    ]);
    const payload = toImportPayload(res.rows);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      name: "Cola",
      sale_type: "unit",
      cost_price: 7000,
      selling_price: 9000,
      quantity: 100,
      low_stock_alert: 20,
    });
  });

  it("duplicate qatorlar payload'ga kirmaydi", () => {
    const res = buildPreview([
      header.concat("Barcode"),
      ["A", "dona", "1000", "1500", "5", "111"],
      ["B", "dona", "1000", "1500", "5", "111"],
    ]);
    expect(toImportPayload(res.rows)).toHaveLength(1);
  });
});

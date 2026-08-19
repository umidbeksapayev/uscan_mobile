import {
  feedText,
  flushIdle,
  isScannerBurst,
  isBurstInProgress,
  SCAN_MIN_LENGTH,
  HID_IDLE_MS,
  MAX_MS_PER_CHAR,
  type HidState,
} from "../hid-parse";

describe("feedText", () => {
  it("terminatorgacha yig'adi, chiqarmaydi", () => {
    const r = feedText(null, "478001", 1000);
    expect(r.emit).toBeNull();
    expect(r.state?.buffer).toBe("478001");
  });

  it("Enter kelganda kodni chiqaradi va buferni tozalaydi", () => {
    const r = feedText({ buffer: "478001", lastAt: 1000 }, "4780010012345\n", 1010);
    expect(r.emit).toBe("4780010012345");
    expect(r.state).toBeNull();
  });

  it("\r va \r\n terminatorlarini ham qabul qiladi", () => {
    // Skaner modeliga qarab Enter uch xil shaklda keladi.
    expect(feedText(null, "20000001\r", 1000).emit).toBe("20000001");
    expect(feedText(null, "20000001\r\n", 1000).emit).toBe("20000001");
  });

  it("kumulyativ qiymatni QO'SHMAYDI (ikki barobar kod chiqmasin)", () => {
    // `TextInput` har safar to'liq qiymat beradi, o'sish emas.
    const a = feedText(null, "4780", 1000);
    const b = feedText(a.state, "4780010012345", 1005);
    expect(b.state?.buffer).toBe("4780010012345");
  });

  it("juda qisqa kodni chiqarmaydi", () => {
    expect(feedText(null, "7\n", 1000).emit).toBeNull();
  });

  it("juda uzun axlatni chiqarmaydi", () => {
    expect(feedText(null, "9".repeat(65) + "\n", 1000).emit).toBeNull();
  });

  it("atrofdagi bo'shliqni tozalaydi", () => {
    expect(feedText(null, "  4780010012345  \n", 1000).emit).toBe("4780010012345");
  });
});

describe("flushIdle", () => {
  const st = (buffer: string, lastAt: number): HidState => ({ buffer, lastAt });

  it("tanaffus tugamaguncha kutadi", () => {
    const r = flushIdle(st("4780010012345", 1000), 1000 + HID_IDLE_MS - 1);
    expect(r.emit).toBeNull();
    expect(r.state).not.toBeNull();
  });

  it("tanaffusdan keyin chiqaradi — TERMINATORSIZ skaner uchun", () => {
    // Bu yo'l bo'lmasa terminatori o'chirilgan skanerning kodi buferda
    // abadiy qolib ketardi va hech qachon o'qilmasdi.
    const r = flushIdle(st("4780010012345", 1000), 1000 + HID_IDLE_MS + 1);
    expect(r.emit).toBe("4780010012345");
    expect(r.state).toBeNull();
  });

  it("bo'sh holatda hech nima qilmaydi", () => {
    expect(flushIdle(null, 5000)).toEqual({ state: null, emit: null });
  });

  it("tanaffus skaner belgi oralig'idan (~20ms) ancha uzun", () => {
    expect(HID_IDLE_MS).toBeGreaterThan(60);
  });
});

describe("isScannerBurst", () => {
  it("skaner tezligini taniydi", () => {
    // 13 xonali EAN skanerdan ~150ms da keladi.
    expect(isScannerBurst(13, 150)).toBe(true);
    // Bitta hodisada kelgan matn (RN kiritishni birlashtirsa) — elapsed ~0.
    expect(isScannerBurst(13, 0)).toBe(true);
  });

  it("odam yozganini skaner deb hisoblamaydi", () => {
    // ~150ms/belgi — tez yozadigan odam. 13 belgi ≈ 2 soniya.
    expect(isScannerBurst(13, 2000)).toBe(false);
    expect(isScannerBurst(6, 1200)).toBe(false);
  });

  it("chegara ikkala tomondan ham keng bo'shliqda", () => {
    // Skaner eng sekin holatda ~20ms/belgi, odam eng tez ~150ms/belgi.
    expect(MAX_MS_PER_CHAR).toBeGreaterThan(20);
    expect(MAX_MS_PER_CHAR).toBeLessThan(150);
  });

  it("juda qisqa va juda uzun matnni rad etadi", () => {
    expect(isScannerBurst(2, 0)).toBe(false);
    expect(isScannerBurst(65, 0)).toBe(false);
  });
});

describe("isBurstInProgress", () => {
  it("bitta hodisada 4+ belgi — odam qila olmaydi", () => {
    // Eng ishonchli belgi: vaqtga ham, uzunlikka ham tayanmaydi.
    expect(isBurstInProgress(10, 10, 0)).toBe(true);
    expect(isBurstInProgress(4, 4, 0)).toBe(true);
  });

  it("bittalab yozilgan belgilarni odam deb hisoblaydi", () => {
    // Odam har hodisada bitta belgi yuboradi va sekin.
    expect(isBurstInProgress(1, 1, 0)).toBe(false);
    expect(isBurstInProgress(4, 1, 800)).toBe(false);
    expect(isBurstInProgress(8, 1, 1600)).toBe(false);
  });

  it("bittalab, LEKIN skaner tezligida kelsa — skaner", () => {
    // Ba'zi qurilmalarda RN belgilarni birlashtirmaydi.
    expect(isBurstInProgress(8, 1, 80)).toBe(true);
  });

  it("qisqa matnni skaner deb hisoblamaydi (soxta ishga tushish)", () => {
    // Tez yozadigan odam 3 belgini 150ms da urib yuborishi mumkin.
    expect(isBurstInProgress(3, 1, 100)).toBe(false);
  });
});

describe("SCAN_MIN_LENGTH", () => {
  it("haqiqiy shtrix-kod formatlaridan past", () => {
    // EAN-8 = 8, ichki kod = 8, EAN-13 = 13 — hammasi chegaradan yuqori.
    expect(SCAN_MIN_LENGTH).toBeLessThanOrEqual(8);
  });
  it("lekin tasodifiy qisqa matndan yuqori", () => {
    expect(SCAN_MIN_LENGTH).toBeGreaterThan(3);
  });
});

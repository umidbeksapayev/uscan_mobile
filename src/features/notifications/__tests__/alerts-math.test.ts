import { buildAlerts, alertBadgeCount } from "../alerts-math";

const base = {
  unsyncedCount: 0,
  lowStockCount: 0,
  debtorCount: 0,
  canManageDebt: true,
};

describe("buildAlerts", () => {
  it("hammasi nol bo'lsa bo'sh ro'yxat", () => {
    expect(buildAlerts(base)).toEqual([]);
  });

  it("faqat nolga teng bo'lmaganlar tushadi", () => {
    expect(buildAlerts({ ...base, lowStockCount: 3 })).toEqual([{ kind: "lowStock", count: 3 }]);
  });

  it("ustuvorlik: yuborilmagan sotuvlar birinchi, keyin kam qoldiq, keyin qarzdorlar", () => {
    const alerts = buildAlerts({
      unsyncedCount: 2,
      lowStockCount: 5,
      debtorCount: 7,
      canManageDebt: true,
    });
    expect(alerts.map((a) => a.kind)).toEqual(["unsynced", "lowStock", "debtors"]);
  });

  it("manage_debt ruxsati yo'q bo'lsa qarzdorlar ko'rsatilmaydi", () => {
    const alerts = buildAlerts({ ...base, debtorCount: 9, canManageDebt: false });
    expect(alerts).toEqual([]);
  });

  it("ruxsat yo'q bo'lsa ham qolgan ogohlantirishlar qoladi", () => {
    const alerts = buildAlerts({
      unsyncedCount: 1,
      lowStockCount: 0,
      debtorCount: 9,
      canManageDebt: false,
    });
    expect(alerts).toEqual([{ kind: "unsynced", count: 1 }]);
  });
});

describe("alertBadgeCount", () => {
  it("sanoq — TURLAR soni, sanoqlar yig'indisi emas", () => {
    const alerts = buildAlerts({
      unsyncedCount: 3,
      lowStockCount: 12,
      debtorCount: 0,
      canManageDebt: true,
    });
    // 3 + 12 = 15 EMAS — ikki turdagi muammo bor, ya'ni 2.
    expect(alertBadgeCount(alerts)).toBe(2);
  });

  it("bo'sh ro'yxat → 0", () => {
    expect(alertBadgeCount([])).toBe(0);
  });
});

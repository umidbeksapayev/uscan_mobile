import { buildAlerts, alertBadgeCount } from "../alerts-math";

const base = {
  unsyncedCount: 0,
  lowStockCount: 0,
  debtorCount: 0,
  canManageDebt: true,
  lossSalesCount: 0,
  returnsSpike: false,
  returnsToday: 0,
  cashShortfallCount: 0,
  isOwner: true,
};

describe("buildAlerts", () => {
  it("hammasi nol bo'lsa bo'sh ro'yxat", () => {
    expect(buildAlerts(base)).toEqual([]);
  });

  it("faqat nolga teng bo'lmaganlar tushadi", () => {
    expect(buildAlerts({ ...base, lowStockCount: 3 })).toEqual([{ kind: "lowStock", count: 3 }]);
  });

  it("ustuvorlik: yuborilmagan sotuvlar birinchi, keyin kam qoldiq, keyin qarzdorlar", () => {
    const alerts = buildAlerts({ ...base, unsyncedCount: 2, lowStockCount: 5, debtorCount: 7 });
    expect(alerts.map((a) => a.kind)).toEqual(["unsynced", "lowStock", "debtors"]);
  });

  it("manage_debt ruxsati yo'q bo'lsa qarzdorlar ko'rsatilmaydi", () => {
    const alerts = buildAlerts({ ...base, debtorCount: 9, canManageDebt: false });
    expect(alerts).toEqual([]);
  });

  it("ruxsat yo'q bo'lsa ham qolgan ogohlantirishlar qoladi", () => {
    const alerts = buildAlerts({ ...base, unsyncedCount: 1, debtorCount: 9, canManageDebt: false });
    expect(alerts).toEqual([{ kind: "unsynced", count: 1 }]);
  });

  it("egasi bo'lsa anomaliya alertlari qo'shiladi", () => {
    const alerts = buildAlerts({
      ...base,
      lossSalesCount: 2,
      returnsSpike: true,
      returnsToday: 4,
      cashShortfallCount: 1,
    });
    expect(alerts).toEqual([
      { kind: "lossSales", count: 2 },
      { kind: "returnsSpike", count: 4 },
      { kind: "cashShortfall", count: 1 },
    ]);
  });

  it("egasi bo'lmasa anomaliya sonlari bo'lsa ham chiqmaydi (tan narx/foyda bilan bog'liq)", () => {
    const alerts = buildAlerts({
      ...base,
      isOwner: false,
      lossSalesCount: 2,
      returnsSpike: true,
      returnsToday: 4,
      cashShortfallCount: 1,
    });
    expect(alerts).toEqual([]);
  });
});

describe("alertBadgeCount", () => {
  it("sanoq — TURLAR soni, sanoqlar yig'indisi emas", () => {
    const alerts = buildAlerts({ ...base, unsyncedCount: 3, lowStockCount: 12 });
    // 3 + 12 = 15 EMAS — ikki turdagi muammo bor, ya'ni 2.
    expect(alertBadgeCount(alerts)).toBe(2);
  });

  it("bo'sh ro'yxat → 0", () => {
    expect(alertBadgeCount([])).toBe(0);
  });
});

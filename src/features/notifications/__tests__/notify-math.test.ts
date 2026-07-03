import { shouldNotifyLowStock, nextOccurrence, tashkentDateString } from "../notify-math";

describe("shouldNotifyLowStock", () => {
  it("hech qachon yuborilmagan (null) → true", () => {
    expect(shouldNotifyLowStock(null, "2026-07-02")).toBe(true);
  });

  it("bugun allaqachon yuborilgan → false", () => {
    expect(shouldNotifyLowStock("2026-07-02", "2026-07-02")).toBe(false);
  });

  it("kecha yuborilgan → true", () => {
    expect(shouldNotifyLowStock("2026-07-01", "2026-07-02")).toBe(true);
  });
});

describe("nextOccurrence", () => {
  it("vaqt hali kelmagan bo'lsa — bugun", () => {
    const now = new Date(2026, 6, 2, 6, 30); // 06:30 mahalliy
    const next = nextOccurrence(8, 0, now);
    expect(next.getDate()).toBe(2);
    expect(next.getHours()).toBe(8);
    expect(next.getMinutes()).toBe(0);
  });

  it("vaqt o'tgan bo'lsa — ertaga", () => {
    const now = new Date(2026, 6, 2, 9, 15);
    const next = nextOccurrence(8, 0, now);
    expect(next.getDate()).toBe(3);
    expect(next.getHours()).toBe(8);
  });

  it("aynan shu daqiqa bo'lsa — ertaga (o'tib ketgan hisoblanadi)", () => {
    const now = new Date(2026, 6, 2, 8, 0, 0, 0);
    const next = nextOccurrence(8, 0, now);
    expect(next.getDate()).toBe(3);
  });
});

describe("tashkentDateString", () => {
  it("UTC yarim tundan oldin ham Toshkentda ertasi kun bo'lishi mumkin", () => {
    // 2026-07-01 20:00 UTC = 2026-07-02 01:00 Toshkent (UTC+5)
    expect(tashkentDateString(new Date(Date.UTC(2026, 6, 1, 20, 0)))).toBe("2026-07-02");
  });

  it("oddiy kunduz — bir xil sana", () => {
    // 2026-07-02 07:00 UTC = 12:00 Toshkent
    expect(tashkentDateString(new Date(Date.UTC(2026, 6, 2, 7, 0)))).toBe("2026-07-02");
  });
});

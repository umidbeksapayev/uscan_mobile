import {
  isExpiredPrinted,
  labelJobId,
  receiptJobId,
  reprintJobId,
  shouldRetryJob,
  MAX_JOB_ATTEMPTS,
  PRINTED_RETENTION_DAYS,
} from "../print-queue";

describe("idempotency kalitlari", () => {
  it("bir xil sotuv HAR DOIM bir xil chek kalitini beradi", () => {
    // "Chek" tugmasini ikki marta bosish shu tenglik bilan to'siladi.
    expect(receiptJobId("sale-123")).toBe(receiptJobId("sale-123"));
    expect(receiptJobId("sale-123")).not.toBe(receiptJobId("sale-124"));
  });

  it("ataylab qayta chiqarish HAR SAFAR boshqa kalit beradi", () => {
    // Foydalanuvchi Tarixdan nusxa so'raganda idempotency TO'SIQ bo'lmasligi kerak.
    const a = reprintJobId("sale-123", "nonce-a");
    const b = reprintJobId("sale-123", "nonce-b");
    expect(a).not.toBe(b);
  });

  it("qayta chiqarish kaliti oddiy chek kaliti bilan to'qnashmaydi", () => {
    expect(reprintJobId("sale-123", "n")).not.toBe(receiptJobId("sale-123"));
  });

  it("yorliq kaliti chek kaliti bilan to'qnashmaydi", () => {
    expect(labelJobId("sale-123")).not.toBe(receiptJobId("sale-123"));
  });
});

describe("shouldRetryJob", () => {
  it("bekor qilingan ishni navbatda ushlab qolmaydi", () => {
    expect(shouldRetryJob(1, "cancelled")).toBe(false);
  });

  it("qog'ozsiz printerni cheksiz urinmaydi", () => {
    expect(shouldRetryJob(1, "device")).toBe(false);
  });

  it("aloqa xatosida chegaragacha urinadi", () => {
    expect(shouldRetryJob(1, "connection")).toBe(true);
    expect(shouldRetryJob(MAX_JOB_ATTEMPTS - 1, "connection")).toBe(true);
    expect(shouldRetryJob(MAX_JOB_ATTEMPTS, "connection")).toBe(false);
  });
});

describe("isExpiredPrinted", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");

  it("yangi chiqarilgan chekni saqlaydi (dublikat himoyasi shunga tayanadi)", () => {
    expect(isExpiredPrinted("2026-08-16T11:00:00.000Z", now)).toBe(false);
    expect(isExpiredPrinted("2026-08-10T12:00:00.000Z", now)).toBe(false);
  });

  it("muddati o'tganini tozalashga qo'yadi", () => {
    const old = new Date(now - (PRINTED_RETENTION_DAYS + 1) * 86400_000).toISOString();
    expect(isExpiredPrinted(old, now)).toBe(true);
  });

  it("buzilgan sanani saqlamaydi", () => {
    expect(isExpiredPrinted("nima-bu", now)).toBe(true);
    expect(isExpiredPrinted("", now)).toBe(true);
  });
});

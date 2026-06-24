import { uuidv4 } from "../uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv4", () => {
  it("RFC 4122 v4 formatига mos", () => {
    expect(uuidv4()).toMatch(UUID_RE);
  });

  it("har safar boshqacha (takrorlanmaydi)", () => {
    const set = new Set(Array.from({ length: 100 }, () => uuidv4()));
    expect(set.size).toBe(100);
  });
});

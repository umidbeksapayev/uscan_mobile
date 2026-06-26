import {
  enqueue, remove, markSyncing, markDone, markFailed, incrementAttempt,
  pendingCount, pendingItems, failedItems, MAX_ATTEMPTS, type QueuedSale,
} from "../sale-queue";

function sale(id: string, over: Partial<QueuedSale> = {}): QueuedSale {
  return {
    client_id: id, shop_id: "s", items: [{ product_id: "p", quantity: 1 }],
    customer_id: null, paid_amount: null, method: "cash", status: "pending",
    error: null, attempt: 0, created_at: "t", updated_at: "t", ...over,
  };
}

describe("sale-queue (sof holat mantiqi)", () => {
  it("enqueue dublikat client_id qo'shmaydi", () => {
    let l = enqueue([], sale("a"));
    l = enqueue(l, sale("a"));
    expect(l).toHaveLength(1);
    l = enqueue(l, sale("b"));
    expect(l).toHaveLength(2);
  });

  it("remove client_id bo'yicha", () => {
    const l = [sale("a"), sale("b")];
    expect(remove(l, "a").map((s) => s.client_id)).toEqual(["b"]);
  });

  it("markSyncing/Done/Failed status o'zgartiradi", () => {
    const l = [sale("a")];
    expect(markSyncing(l, "a")[0].status).toBe("syncing");
    expect(markDone(l, "a")[0].status).toBe("done");
    const f = markFailed(l, "a", "Yetarli miqdor yo'q");
    expect(f[0].status).toBe("failed");
    expect(f[0].error).toBe("Yetarli miqdor yo'q");
  });

  it("incrementAttempt MAX ga yetganda failed bo'ladi", () => {
    const l = incrementAttempt([sale("a", { attempt: MAX_ATTEMPTS - 1 })], "a");
    expect(l[0].attempt).toBe(MAX_ATTEMPTS);
    expect(l[0].status).toBe("failed");
  });

  it("incrementAttempt MAX dan past → status saqlanadi", () => {
    const l = incrementAttempt([sale("a", { attempt: 0, status: "pending" })], "a");
    expect(l[0].attempt).toBe(1);
    expect(l[0].status).toBe("pending");
  });

  it("pendingCount/pendingItems/failedItems", () => {
    const l = [sale("a"), sale("b", { status: "done" }), sale("c", { status: "failed" }), sale("d")];
    expect(pendingCount(l)).toBe(2);
    expect(pendingItems(l).map((s) => s.client_id)).toEqual(["a", "d"]);
    expect(failedItems(l).map((s) => s.client_id)).toEqual(["c"]);
  });
});

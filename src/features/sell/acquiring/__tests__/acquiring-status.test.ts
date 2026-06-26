import { mapIntentStatus, acquiringStatusUI } from "../acquiring-status";

describe("mapIntentStatus", () => {
  it("null / pending → pending", () => {
    expect(mapIntentStatus(null)).toBe("pending");
    expect(mapIntentStatus(undefined)).toBe("pending");
    expect(mapIntentStatus("pending")).toBe("pending");
  });
  it("paid / canceled / timeout to'g'ridan map", () => {
    expect(mapIntentStatus("paid")).toBe("paid");
    expect(mapIntentStatus("canceled")).toBe("canceled");
    expect(mapIntentStatus("timeout")).toBe("timeout");
  });
  it("noma'lum holat → error", () => {
    expect(mapIntentStatus("weird")).toBe("error");
  });
});

describe("acquiringStatusUI", () => {
  it("har holat uchun label + icon", () => {
    expect(acquiringStatusUI("pending").icon).toBe("qr-code-outline");
    expect(acquiringStatusUI("paid").icon).toBe("checkmark-circle");
    expect(acquiringStatusUI("canceled").icon).toBe("close-circle");
    expect(acquiringStatusUI("timeout").icon).toBe("hourglass-outline");
    expect(acquiringStatusUI("error").icon).toBe("alert-circle");
    expect(acquiringStatusUI("paid").label).toBe("To'landi");
  });
});

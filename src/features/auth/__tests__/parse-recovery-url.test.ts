import { parseRecoveryParams } from "../parse-recovery-url";

const BASE = "uscan://reset-password";

describe("parseRecoveryParams", () => {
  it("to'g'ri recovery URL'dan token'larni ajratadi", () => {
    const url = `${BASE}#access_token=abc123&refresh_token=def456&type=recovery&expires_in=3600`;
    expect(parseRecoveryParams(url)).toEqual({ accessToken: "abc123", refreshToken: "def456" });
  });

  it("null/undefined/bo'sh → null", () => {
    expect(parseRecoveryParams(null)).toBeNull();
    expect(parseRecoveryParams(undefined)).toBeNull();
    expect(parseRecoveryParams("")).toBeNull();
  });

  it("fragment yo'q bo'lsa → null", () => {
    expect(parseRecoveryParams(BASE)).toBeNull();
  });

  it("type recovery bo'lmasa → null", () => {
    const url = `${BASE}#access_token=abc&refresh_token=def&type=signup`;
    expect(parseRecoveryParams(url)).toBeNull();
  });

  it("token yetishmasa → null", () => {
    expect(parseRecoveryParams(`${BASE}#type=recovery&access_token=abc`)).toBeNull();
    expect(parseRecoveryParams(`${BASE}#type=recovery&refresh_token=def`)).toBeNull();
  });
});

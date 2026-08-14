import { parseAuthUrlTokens } from "../parse-auth-url";

const BASE = "uscan://verify-email";

describe("parseAuthUrlTokens", () => {
  it("to'g'ri signup URL'dan token'larni ajratadi", () => {
    const url = `${BASE}#access_token=abc123&refresh_token=def456&type=signup&expires_in=3600`;
    expect(parseAuthUrlTokens(url, "signup")).toEqual({
      accessToken: "abc123",
      refreshToken: "def456",
    });
  });

  it("null/undefined/bo'sh → null", () => {
    expect(parseAuthUrlTokens(null, "signup")).toBeNull();
    expect(parseAuthUrlTokens(undefined, "signup")).toBeNull();
    expect(parseAuthUrlTokens("", "signup")).toBeNull();
  });

  it("fragment yo'q bo'lsa → null", () => {
    expect(parseAuthUrlTokens(BASE, "signup")).toBeNull();
  });

  it("type kutilganidan farqli bo'lsa → null (recovery havolasi signup'ga tushmasin)", () => {
    const url = `${BASE}#access_token=abc&refresh_token=def&type=recovery`;
    expect(parseAuthUrlTokens(url, "signup")).toBeNull();
  });

  it("token yetishmasa → null", () => {
    expect(parseAuthUrlTokens(`${BASE}#type=signup&access_token=abc`, "signup")).toBeNull();
    expect(parseAuthUrlTokens(`${BASE}#type=signup&refresh_token=def`, "signup")).toBeNull();
  });
});

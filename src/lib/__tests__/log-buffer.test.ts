import {
  appendEntry,
  formatLogText,
  redact,
  toMessage,
  LOG_BUFFER_MAX,
  LOG_MESSAGE_MAX,
  type LogEntry,
} from "../log-buffer";

function entry(scope: string, message = "x"): LogEntry {
  return { at: "2026-08-04T10:00:00.000Z", scope, message };
}

describe("toMessage", () => {
  it("Error'dan message oladi", () => {
    expect(toMessage(new Error("tarmoq yo'q"))).toBe("tarmoq yo'q");
  });

  it("message bo'sh bo'lsa name'ga tushadi", () => {
    expect(toMessage(new TypeError(""))).toBe("TypeError");
  });

  it("satrni o'zgarishsiz qaytaradi", () => {
    expect(toMessage("oddiy xato")).toBe("oddiy xato");
  });

  it("null/undefined uchun 'unknown'", () => {
    expect(toMessage(null)).toBe("unknown");
    expect(toMessage(undefined)).toBe("unknown");
  });

  it("obyektni JSON qiladi", () => {
    expect(toMessage({ code: 42 })).toBe('{"code":42}');
  });

  it("aylanma havolali obyektda yiqilmaydi", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(typeof toMessage(circular)).toBe("string");
  });

  it("uzun matnni kesadi", () => {
    const long = "a".repeat(LOG_MESSAGE_MAX + 50);
    const result = toMessage(long);
    expect(result).toHaveLength(LOG_MESSAGE_MAX + 1); // + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("appendEntry", () => {
  it("yangi yozuvni boshiga qo'yadi", () => {
    const result = appendEntry([entry("eski")], entry("yangi"));
    expect(result.map((e) => e.scope)).toEqual(["yangi", "eski"]);
  });

  it("kirish massivini o'zgartirmaydi", () => {
    const original = [entry("a")];
    appendEntry(original, entry("b"));
    expect(original).toHaveLength(1);
  });

  it("chegaradan oshganda eng eskisini chiqaradi", () => {
    let buffer: LogEntry[] = [];
    for (let i = 0; i < LOG_BUFFER_MAX + 10; i++) {
      buffer = appendEntry(buffer, entry(`s${i}`));
    }
    expect(buffer).toHaveLength(LOG_BUFFER_MAX);
    expect(buffer[0].scope).toBe(`s${LOG_BUFFER_MAX + 9}`);
    expect(buffer[buffer.length - 1].scope).toBe("s10");
  });

  it("max 0 bo'lsa bo'sh qaytaradi", () => {
    expect(appendEntry([entry("a")], entry("b"), 0)).toEqual([]);
  });
});

describe("formatLogText", () => {
  it("bo'sh buferda bo'sh satr", () => {
    expect(formatLogText([])).toBe("");
  });

  it("har yozuv alohida qatorda: domen, keyin scope", () => {
    const text = formatLogText([
      { ...entry("sync.push", "500"), domain: "SYNC" },
      { ...entry("print.bt", "yo'q"), domain: "PRINT" },
    ]);
    expect(text).toBe(
      "2026-08-04T10:00:00.000Z [SYNC] [sync.push] 500\n" +
        "2026-08-04T10:00:00.000Z [PRINT] [print.bt] yo'q",
    );
  });

  it("domensiz ESKI yozuvlarda ham yiqilmaydi (bufer versiyalanmagan)", () => {
    expect(formatLogText([entry("sync.push", "500")])).toContain("[APP] [sync.push]");
  });
});

describe("redact", () => {
  it("Supabase/JWT tokenini o'chiradi", () => {
    // ⚠️ Eng muhim holat: jurnal "Ulashish" bilan tashqariga chiqadi, ya'ni
    // tozalanmasa sessiya tokeni ham birga ketardi. Muhimi — JWT YO'Q bo'lishi;
    // qaysi marker qolgani ("<token>" yoki "token=<redacted>") ahamiyatsiz,
    // chunki bu yerda ikkala qoida ham ishga tushadi.
    const msg = redact("Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def");
    expect(msg).not.toContain("eyJhbGci");
  });

  it("kalit so'zsiz kelgan JWT ham o'chadi", () => {
    // Supabase xatolari tokenni ba'zan hech qanday kalitsiz qo'shadi.
    const msg = redact("request failed eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def");
    expect(msg).toContain("<token>");
    expect(msg).not.toContain("eyJhbGci");
  });

  it("kalit=qiymat shaklidagi sirlarni o'chiradi", () => {
    expect(redact('{"password":"Salom123"}')).not.toContain("Salom123");
    expect(redact("token=abc123xyz")).not.toContain("abc123xyz");
    expect(redact("apikey: sk_live_9f8e7d")).not.toContain("sk_live_9f8e7d");
  });

  it("Bearer sarlavhasini o'chiradi", () => {
    expect(redact("Authorization: Bearer abc.def.ghi")).not.toContain("abc.def.ghi");
  });

  it("karta raqamini niqoblaydi, oxirgi 4 raqam qoladi", () => {
    const out = redact("card 8600 1234 5678 9012 rad etildi");
    expect(out).toContain("****9012");
    expect(out).not.toContain("8600 1234");
  });

  it("EAN-13 shtrix-kodni SAQLAYDI (skaner nosozligini shusiz tekshirib bo'lmaydi)", () => {
    // 13 raqam — karta emas, shtrix-kod. Niqob 14+ dan boshlanadi.
    expect(redact("Topilmadi: 4780010012345")).toContain("4780010012345");
  });

  it("oddiy xato matnini o'zgartirmaydi", () => {
    expect(redact("Network request failed")).toBe("Network request failed");
  });
});

describe("toMessage + redact", () => {
  it("token kesishdan OLDIN tozalanadi (yarim token qolmaydi)", () => {
    const long = `xato ${"eyJ" + "A".repeat(LOG_MESSAGE_MAX)} oxiri`;
    const out = toMessage(long);
    expect(out).not.toContain("eyJA");
    expect(out).toContain("<token>");
  });
});

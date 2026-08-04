import {
  appendEntry,
  formatLogText,
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

  it("har yozuv alohida qatorda, scope qavsda", () => {
    const text = formatLogText([entry("sync.push", "500"), entry("notify", "yo'q")]);
    expect(text).toBe(
      "2026-08-04T10:00:00.000Z [sync.push] 500\n2026-08-04T10:00:00.000Z [notify] yo'q",
    );
  });
});

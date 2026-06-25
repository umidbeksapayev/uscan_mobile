import { escapeLike } from "../escape-like";

describe("escapeLike (ilike wildcard literal qilish)", () => {
  it("oddiy matnni o'zgartirmaydi", () => {
    expect(escapeLike("non")).toBe("non");
    expect(escapeLike("Coca Cola")).toBe("Coca Cola");
  });

  it("% va _ belgilarini escape qiladi", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
  });

  it("backslashni ham escape qiladi (avval)", () => {
    expect(escapeLike("c\\d")).toBe("c\\\\d");
  });

  it("aralash belgilar", () => {
    expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
  });
});

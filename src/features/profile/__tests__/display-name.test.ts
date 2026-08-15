import { displayName, initials } from "../display-name";

describe("displayName", () => {
  it("ism bo'lsa o'shani qaytaradi", () => {
    expect(displayName({ full_name: "Umidbek Sapayev" }, "u@x.com")).toBe("Umidbek Sapayev");
  });

  it("ism bo'sh/probel bo'lsa email prefiksiga tushadi", () => {
    expect(displayName({ full_name: "   " }, "kassir01@gmail.com")).toBe("kassir01");
    expect(displayName({ full_name: null }, "kassir01@gmail.com")).toBe("kassir01");
    expect(displayName(null, "kassir01@gmail.com")).toBe("kassir01");
  });

  it("ikkalasi ham bo'lmasa zaxira matn", () => {
    expect(displayName(null, null)).toBe("Foydalanuvchi");
    expect(displayName(null, "", "Mehmon")).toBe("Mehmon");
  });
});

describe("initials", () => {
  it("ikki so'zdan ikkita harf", () => {
    expect(initials("Umidbek Sapayev")).toBe("US");
  });

  it("bitta so'zdan bitta harf", () => {
    expect(initials("umidbek")).toBe("U");
  });

  it("uchinchi so'z e'tiborga olinmaydi", () => {
    expect(initials("Ali Vali G'ani")).toBe("AV");
  });

  it("bo'sh matnda zaxira harf", () => {
    expect(initials("   ")).toBe("U");
  });
});

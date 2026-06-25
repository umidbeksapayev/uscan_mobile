import { validateProductInput } from "../validate-product";

const ok = { name: "Coca-Cola", sellingPrice: 5000, costPrice: 4000, quantity: 10 };

describe("validateProductInput", () => {
  it("to'g'ri kiritishda null qaytaradi", () => {
    expect(validateProductInput(ok)).toBeNull();
  });

  it("nom bo'sh yoki faqat probel bo'lsa xato (name)", () => {
    expect(validateProductInput({ ...ok, name: "" })?.field).toBe("name");
    expect(validateProductInput({ ...ok, name: "   " })?.field).toBe("name");
  });

  it("sotuv narxi 0 yoki manfiy bo'lsa xato (sellingPrice)", () => {
    expect(validateProductInput({ ...ok, sellingPrice: 0 })?.field).toBe("sellingPrice");
    expect(validateProductInput({ ...ok, sellingPrice: -1 })?.field).toBe("sellingPrice");
  });

  it("tan narxi manfiy bo'lsa xato, 0 ga ruxsat (costPrice)", () => {
    expect(validateProductInput({ ...ok, costPrice: -5 })?.field).toBe("costPrice");
    expect(validateProductInput({ ...ok, costPrice: 0 })).toBeNull();
  });

  it("miqdor manfiy bo'lsa xato, 0 ga ruxsat (quantity)", () => {
    expect(validateProductInput({ ...ok, quantity: -1 })?.field).toBe("quantity");
    expect(validateProductInput({ ...ok, quantity: 0 })).toBeNull();
  });

  it("xato obyekti title va message saqlaydi (UI matni)", () => {
    expect(validateProductInput({ ...ok, name: "" })).toEqual({
      field: "name",
      title: "Nomi kerak",
      message: "Mahsulot nomini kiriting.",
    });
  });
});

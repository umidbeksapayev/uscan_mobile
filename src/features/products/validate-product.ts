/**
 * Mahsulot kiritish validatsiyasi — markazlashtirilgan va test qilinadigan.
 * `product-form` onSave'da ishlatiladi. UI matni avvalgi inline tekshiruv bilan
 * byte-aniq bir xil (xatti-harakat o'zgarmaydi), qo'shimcha manfiy-qiymat
 * himoyalari defensiv (number-pad odatda yo'l qo'ymaydi).
 */
export type ProductInput = {
  name: string;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
};

export type ProductValidationError = {
  field: "name" | "sellingPrice" | "costPrice" | "quantity";
  title: string;
  message: string;
};

export function validateProductInput(input: ProductInput): ProductValidationError | null {
  if (!input.name.trim()) {
    return { field: "name", title: "Nomi kerak", message: "Mahsulot nomini kiriting." };
  }
  if (!(input.sellingPrice > 0)) {
    return { field: "sellingPrice", title: "Narx kerak", message: "Sotuv narxini kiriting." };
  }
  if (input.costPrice < 0) {
    return { field: "costPrice", title: "Noto'g'ri tan narxi", message: "Tan narxi manfiy bo'lmasligi kerak." };
  }
  if (input.quantity < 0) {
    return { field: "quantity", title: "Noto'g'ri miqdor", message: "Miqdor manfiy bo'lmasligi kerak." };
  }
  return null;
}

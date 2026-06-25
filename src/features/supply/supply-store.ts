import { create } from "zustand";
import type { SaleType } from "@/types/database";

/** Kirim savatidagi bitta qator (lokal — DB'ga faqat tasdiqlashda boradi). */
export interface SupplyItem {
  product: {
    id: string;
    name: string;
    sale_type: SaleType;
    image_url: string | null;
    oldCost: number; // joriy tan narx (taqqoslash uchun)
  };
  quantity: number; // dona yoki kg
  costPrice: number; // shu partiya tan narxi (so'm)
}

interface SupplyState {
  items: SupplyItem[];
  /** Qo'shadi yoki mavjud mahsulotni almashtiradi (oxiriga ko'taradi). */
  add: (item: SupplyItem) => void;
  setQty: (productId: string, quantity: number) => void;
  setCost: (productId: string, costPrice: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useSupplyCart = create<SupplyState>((set) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const rest = s.items.filter((x) => x.product.id !== item.product.id);
      return { items: [...rest, item] };
    }),
  setQty: (productId, quantity) =>
    set((s) => ({
      items: s.items.map((x) => (x.product.id === productId ? { ...x, quantity } : x)),
    })),
  setCost: (productId, costPrice) =>
    set((s) => ({
      items: s.items.map((x) => (x.product.id === productId ? { ...x, costPrice } : x)),
    })),
  remove: (productId) =>
    set((s) => ({ items: s.items.filter((x) => x.product.id !== productId) })),
  clear: () => set({ items: [] }),
}));

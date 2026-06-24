import { create } from "zustand";

import type { Product } from "@/types/database";

export interface CartItem {
  product: Product;
  /** unit: dona (butun), weight: kg (kasr). */
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],

  add: (product) =>
    set((s) => {
      const existing = s.items.find((i) => i.product.id === product.id);
      if (existing) {
        // DONALI → +1; VAZN → savatdagi qoladi (foydalanuvchi kg ni o'zi tahrirlaydi)
        if (product.sale_type === "unit") {
          return {
            items: s.items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          };
        }
        return s;
      }
      // Yangi element: DONALI=1 dona, VAZN=1.000 kg (tahrirlanadi)
      return { items: [...s.items, { product, quantity: 1 }] };
    }),

  setQuantity: (productId, quantity) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(0, quantity) } : i,
      ),
    })),

  increment: (productId) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    })),

  decrement: (productId) =>
    set((s) => ({
      items: s.items.flatMap((i) => {
        if (i.product.id !== productId) return [i];
        const q = i.quantity - 1;
        return q <= 0 ? [] : [{ ...i, quantity: q }];
      }),
    })),

  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

  clear: () => set({ items: [] }),
}));

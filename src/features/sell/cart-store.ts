import { create } from "zustand";

import type { Product } from "@/types/database";

export interface CartItem {
  product: Product;
  /** unit: dona (butun), weight: kg (kasr). */
  quantity: number;
}

interface CartState {
  items: CartItem[];
  /** Skanerда topilgan VAZN mahsulot — Sotuv ekrani uni tezkor oynada so'raydi. */
  pendingWeight: Product | null;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setPendingWeight: (product: Product | null) => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  pendingWeight: null,

  add: (product, quantity) =>
    set((s) => {
      const existing = s.items.find((i) => i.product.id === product.id);
      const rest = s.items.filter((i) => i.product.id !== product.id);
      let qty: number;
      if (quantity !== undefined) {
        qty = quantity; // VAZN: tezkor oynadan kelgan kg (yangilanadi)
      } else if (existing && product.sale_type === "unit") {
        qty = existing.quantity + 1; // DONALI: mavjudga +1
      } else {
        qty = 1;
      }
      // Yangi/yangilangan element DOIM ro'yxat boshida
      return { items: [{ product, quantity: qty }, ...rest] };
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

  setPendingWeight: (product) => set({ pendingWeight: product }),
}));

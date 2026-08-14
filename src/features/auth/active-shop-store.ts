import { create } from "zustand";

import { meta, MetaKeys } from "@/lib/offline/mmkv";

interface ActiveShopState {
  /** Foydalanuvchi qo'lda tanlagan do'kon (MMKV'da saqlanadi — ilova qayta
   *  ochilganda ham eslab qoladi). `null` = hali tanlanmagan (default = eng
   *  yangi a'zolik, `useActiveMembership` hal qiladi). */
  activeShopId: string | null;
  setActiveShopId: (id: string) => void;
  /** Chiqishda chaqiriladi — aks holda qurilmada keyingi kirgan foydalanuvchi
   *  avvalgi userning faol do'konini meros qilib olardi. */
  reset: () => void;
}

export const useActiveShopStore = create<ActiveShopState>((set) => ({
  activeShopId: meta.getString(MetaKeys.activeShopId) ?? null,
  setActiveShopId: (id) => {
    meta.setString(MetaKeys.activeShopId, id);
    set({ activeShopId: id });
  },
  reset: () => {
    meta.remove(MetaKeys.activeShopId);
    set({ activeShopId: null });
  },
}));

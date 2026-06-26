import { create } from "zustand";

import type { SyncResult } from "./sync";

/** Offline UI holati — navbat sanog'i, sync holati, oxirgi natija (badge + toast). */
interface OfflineState {
  pendingCount: number;
  syncing: boolean;
  lastResult: SyncResult | null;
  setCount: (n: number) => void;
  setSyncing: (b: boolean) => void;
  setResult: (r: SyncResult | null) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  pendingCount: 0,
  syncing: false,
  lastResult: null,
  setCount: (n) => set({ pendingCount: n }),
  setSyncing: (b) => set({ syncing: b }),
  setResult: (r) => set({ lastResult: r }),
}));

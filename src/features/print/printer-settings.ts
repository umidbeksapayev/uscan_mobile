import { create } from "zustand";

import { storage } from "@/lib/offline/mmkv";

export type PrinterType = "system" | "bluetooth";

export interface PrinterConfig {
  type: PrinterType;
  btAddress: string | null;
  btName: string | null;
}

const KEY = "printerConfig";
const DEFAULT: PrinterConfig = { type: "system", btAddress: null, btName: null };

function load(): PrinterConfig {
  const raw = storage.getString(KEY);
  if (raw) {
    try {
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<PrinterConfig>) };
    } catch {
      /* ignore */
    }
  }
  return DEFAULT;
}

function save(c: PrinterConfig) {
  storage.set(KEY, JSON.stringify(c));
}

interface PrinterStore extends PrinterConfig {
  setSystem: () => void;
  setBluetooth: (address: string, name: string) => void;
}

export const usePrinterStore = create<PrinterStore>((set) => ({
  ...load(),
  setSystem: () =>
    set(() => {
      const c: PrinterConfig = { type: "system", btAddress: null, btName: null };
      save(c);
      return c;
    }),
  setBluetooth: (btAddress, btName) =>
    set(() => {
      const c: PrinterConfig = { type: "bluetooth", btAddress, btName };
      save(c);
      return c;
    }),
}));

/** Hook'siz o'qish (print-receipt routing uchun). */
export function getPrinterConfig(): PrinterConfig {
  return load();
}

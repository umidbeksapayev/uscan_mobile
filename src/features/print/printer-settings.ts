import { create } from "zustand";

import { storage } from "@/lib/offline/mmkv";
import { logError } from "@/lib/logger";
import type { PrinterKind, PrinterTarget } from "./transport";
import type { Codepage } from "./escpos-codepage";

/** Sozlamadagi TANLOV (jonli ulanish holati emas — u `printer-manager.ts`da). */
export type PrinterType = PrinterKind;

export interface PrinterConfig {
  type: PrinterType;
  btAddress: string | null;
  btName: string | null;
  /**
   * Termal printer kod sahifasi. `ESC t n` raqami printer modeliga qarab
   * farq qilgani uchun bu SOZLAMA — test chek buzilib chiqsa foydalanuvchi
   * boshqasini tanlaydi (`cp1251`), oxirgi chora `ascii`.
   */
  codepage: Codepage;
}

const KEY = "printerConfig";
const DEFAULT: PrinterConfig = {
  type: "system",
  btAddress: null,
  btName: null,
  codepage: "cp866",
};

function load(): PrinterConfig {
  const raw = storage.getString(KEY);
  if (raw) {
    try {
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<PrinterConfig>) };
    } catch (e) {
      // Buzilgan JSON → default sozlama. Foydalanuvchi printer sozlamasini
      // "o'zi qaytib ketdi" deb ko'radi — sababini jurnalda qoldiramiz.
      logError("printerSettings.parse", e);
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
  setCodepage: (codepage: Codepage) => void;
}

export const usePrinterStore = create<PrinterStore>((set, get) => ({
  ...load(),
  setSystem: () =>
    set(() => {
      // Kod sahifasi SAQLANADI — u printer turiga emas, do'kon tiliga bog'liq.
      const c: PrinterConfig = { ...DEFAULT, codepage: get().codepage, type: "system" };
      save(c);
      return c;
    }),
  setBluetooth: (btAddress, btName) =>
    set(() => {
      const c: PrinterConfig = { type: "bluetooth", btAddress, btName, codepage: get().codepage };
      save(c);
      return c;
    }),
  setCodepage: (codepage) =>
    set((s) => {
      const c: PrinterConfig = {
        type: s.type,
        btAddress: s.btAddress,
        btName: s.btName,
        codepage,
      };
      save(c);
      return c;
    }),
}));

/** Hook'siz o'qish (print-receipt routing uchun). */
export function getPrinterConfig(): PrinterConfig {
  return load();
}

/**
 * Sozlamani transport nishoniga aylantiradi — chop etuvchilar `PrinterConfig`
 * ni emas, shuni ishlatadi.
 *
 * ⚠️ Bluetooth tanlangan-u manzil saqlanmagan bo'lsa TIZIM printeriga
 * tushamiz. Bu eski xatti-harakat ataylab saqlangan: aks holda printerini
 * hali tanlamagan foydalanuvchi chek o'rniga xato ko'rardi.
 */
export function printerTarget(cfg: PrinterConfig = load()): PrinterTarget {
  if (cfg.type === "bluetooth" && cfg.btAddress) {
    return { kind: "bluetooth", address: cfg.btAddress, name: cfg.btName };
  }
  return { kind: "system", address: null, name: null };
}

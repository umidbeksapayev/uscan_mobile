import { create } from "zustand";

import { storage } from "@/lib/offline/mmkv";
import { logError } from "@/lib/logger";

/**
 * Tashqi (HID) skaner sozlamasi.
 *
 * ⚠️ Default YOQILGAN. Sabab: ko'rinmas maydon apparat klaviaturasi
 * ULANMAGAN qurilmada hech narsa qilmaydi — ya'ni telefon foydalanuvchisi
 * uchun xarajati nol, skaner ulagan foydalanuvchi esa hech narsa
 * sozlamasdan ishlatib ketadi ("easy setup" — mahsulotning asosiy
 * farqlovchisi).
 *
 * O'chirgich baribir kerak: fokus xatti-harakati qurilmadan qurilmaga farq
 * qiladi va noto'g'ri ishlagan holatda foydalanuvchining chiqish yo'li
 * bo'lishi shart.
 */
const KEY = "scannerConfig";

export interface ScannerConfig {
  externalScanner: boolean;
}

const DEFAULT: ScannerConfig = { externalScanner: true };

function load(): ScannerConfig {
  const raw = storage.getString(KEY);
  if (raw) {
    try {
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<ScannerConfig>) };
    } catch (e) {
      logError("scanner.settings.parse", e);
    }
  }
  return DEFAULT;
}

interface ScannerStore extends ScannerConfig {
  setExternalScanner: (on: boolean) => void;
}

export const useScannerStore = create<ScannerStore>((set) => ({
  ...load(),
  setExternalScanner: (externalScanner) =>
    set(() => {
      const c: ScannerConfig = { externalScanner };
      storage.set(KEY, JSON.stringify(c));
      return c;
    }),
}));

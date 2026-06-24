import { create } from "zustand";

/**
 * Skaner "form" rejimida shtrix-kodni shu yerga qaytaradi (savatga qo'shmaydi).
 * Mahsulot formasi shu kodni o'qib, shtrix-kod maydonini to'ldiradi.
 */
interface ScanReturnState {
  code: string | null;
  setCode: (code: string | null) => void;
}

export const useScanReturn = create<ScanReturnState>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));

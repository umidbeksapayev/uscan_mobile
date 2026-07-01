import { MMKV } from "react-native-mmkv";

/**
 * Tezkor KV — offline metadata (flaglar, sync vaqti, navbat sanog'i).
 * ⚠️ MAXFIY ma'lumot saqlanmaydi (cost_price hech qachon bu yerga yozilmaydi).
 */
export const storage = new MMKV({ id: "uscan-meta" });

export const MetaKeys = {
  online: "online",
  lastProductSyncAt: "lastProductSyncAt",
  queueCount: "queueCount",
  syncRunning: "syncRunning",
  activeShopId: "activeShopId",
} as const;

export const meta = {
  getString: (k: string): string | undefined => storage.getString(k),
  setString: (k: string, v: string) => storage.set(k, v),
  getNumber: (k: string): number => storage.getNumber(k) ?? 0,
  setNumber: (k: string, v: number) => storage.set(k, v),
  getBool: (k: string): boolean => storage.getBoolean(k) ?? false,
  setBool: (k: string, v: boolean) => storage.set(k, v),
  getJSON: <T>(k: string): T | null => {
    const s = storage.getString(k);
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  },
  setJSON: (k: string, v: unknown) => storage.set(k, JSON.stringify(v)),
  remove: (k: string) => storage.delete(k),
};

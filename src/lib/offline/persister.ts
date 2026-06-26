import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

import { storage } from "./mmkv";

/** MMKV (sync) ni AsyncStorage interfeysiga moslash. */
const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: "uscan-query-cache",
  throttleTime: 1000,
});

/** Faqat katalog/kategoriya/membership query'lari offline uchun saqlanadi. */
const PERSISTED_PREFIXES = ["products", "categories", "categories-count", "memberships"];

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 kun
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => {
      const key0 = q.queryKey?.[0];
      return typeof key0 === "string" && PERSISTED_PREFIXES.includes(key0);
    },
  },
};

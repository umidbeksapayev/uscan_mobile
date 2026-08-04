import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** .env to'ldirilganmi (haqiqiy Supabase ulanishi mavjudmi). */
export const isSupabaseConfigured = Boolean(url && anonKey);

// .env hali bo'sh bo'lsa ham createClient yiqilmasligi uchun placeholder.
// Haqiqiy so'rovlar faqat isSupabaseConfigured === true bo'lganda yuboriladi.
// ⚠️ React Native / Expo'da GoTrueClient ichidagi `_acquireLock` navbati
// bir vaqtning o'zida bir necha useQuery so'rovi ketganda cheksiz osiladi
// (deadlock). `lock` parametri funksiya kutadi — quyidagi no-op variant
// lock navbatini butunlay chetlab o'tib, callback'ni darhol chaqiradi.
const noopLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn();

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      lock: noopLock,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Supabase RN rasmiy sozlamasi: token yangilashni faqat ilova faol bo'lganda
// ishlatamiz — bu lock to'qnashuvini (login goh ishlab goh ishlamasligini) yo'qotadi.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});

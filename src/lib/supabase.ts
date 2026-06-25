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
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      // ⚠️ `lock: processLock` ATAYLAB YO'Q. auth-js 2.x da u refresh uchun
      // deprecated no-op, LEKIN berilishi GoTrueClient ichidagi `_acquireLock`/
      // `pendingInLock` drenaj mashinasini yoqadi → RN'da login (signInWithPassword
      // → SIGNED_IN → useMemberships getUser) re-entrant deadlock'iga olib keladi
      // (~30s osilish). Lockless yo'l (this.lock=null) bu sinfni butunlay yo'qotadi.
      // Refresh poygalari klient+server tomonidan boshqariladi (kutubxona tavsiyasi).
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

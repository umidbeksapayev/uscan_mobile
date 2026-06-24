import "react-native-url-polyfill/auto";
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
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

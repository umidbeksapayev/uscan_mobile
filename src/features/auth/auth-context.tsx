import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { storage } from "@/lib/offline/mmkv";
import { logError } from "@/lib/logger";
import { useActiveShopStore } from "./active-shop-store";

/**
 * GoTrueClient RN'da ba'zan (tarmoq/lock sharoitiga qarab) `getSession()`ni
 * abadiy hal qilmasdan qoldiradi (`lib/supabase.ts` dagi `noopLock` izohiga
 * qarang — bu shu muammoning ikkinchi qatlam himoyasi). Muhlat tugasa ham
 * ilova splash ekranida "muzlab" qolmasligi kerak — `session = null` bilan
 * davom etadi, haqiqiy natija keyinroq kelsa o'zi to'g'rilaydi (pastda).
 */
const GET_SESSION_TIMEOUT_MS = 10_000;

/** Persister (src/lib/offline/persister.ts) shu MMKV kalitiga yozadi. */
const PERSISTED_QUERY_CACHE_KEY = "uscan-query-cache";

type AuthState = {
  session: Session | null;
  initializing: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  initializing: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      logError("auth.getSession.timeout", new Error(`${GET_SESSION_TIMEOUT_MS}ms ichida javob kelmadi`));
      setInitializing(false);
    }, GET_SESSION_TIMEOUT_MS);

    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(timeoutId);
      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      // Bitta qurilmada ikkinchi foydalanuvchi kirishi mumkin (masalan, ega
      // telefonni kassirga bergan). Chiqishda keshni tozalamasak, keyingi
      // login'da avvalgi userning mahsulot/statistika/faol-do'kon
      // ma'lumotlari ekranda bir lahza ko'rinib qoladi (React Query
      // persisted cache + MMKV activeShopId user id'ga bog'lanmagan).
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        storage.delete(PERSISTED_QUERY_CACHE_KEY);
        useActiveShopStore.getState().reset();
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

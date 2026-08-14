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
import { useActiveShopStore } from "./active-shop-store";

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
    supabase.auth.getSession().then(({ data }) => {
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

    return () => subscription.unsubscribe();
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

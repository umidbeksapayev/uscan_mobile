import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

import { meta, MetaKeys } from "./offline/mmkv";

/** state'dan online'mi (konservativ: isInternetReachable=false bo'lsa offline). */
function deriveOnline(connected: boolean | null, reachable: boolean | null): boolean {
  return connected === true && reachable !== false;
}

/**
 * Ulanish holati (UI uchun). `isInternetReachable=null` → hali noma'lum,
 * oldingi holatni saqlaymiz (debounce ~400ms — tebranish oldini olish).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() => meta.getBool(MetaKeys.online));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // Hali noma'lum (reachable=null, lekin ulangan) → o'zgartirmaymiz
      if (state.isInternetReachable === null && state.isConnected !== false) return;
      const next = deriveOnline(state.isConnected, state.isInternetReachable);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setOnline((prev) => {
          if (prev !== next) meta.setBool(MetaKeys.online, next);
          return next;
        });
      }, 400);
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      unsub();
    };
  }, []);

  return online;
}

/** Chaqiruv paytidagi avtoritativ tekshiruv (lookup/checkout uchun, hook emas). */
export async function isOnlineNow(): Promise<boolean> {
  try {
    const s = await NetInfo.fetch();
    return deriveOnline(s.isConnected, s.isInternetReachable);
  } catch {
    return meta.getBool(MetaKeys.online);
  }
}

import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useOnline } from "@/lib/use-online";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { syncQueue } from "@/lib/offline/sync";
import { syncProductsFromServer } from "@/lib/offline/product-cache";
import { unsyncedCount } from "@/lib/offline/sale-queue-db";
import { useOfflineStore } from "@/lib/offline/offline-store";

/**
 * Offline orkestratsiya — reconnect / AppState active / focus'da navbatni drenaj
 * qiladi (debounce ~800ms). Navbat bo'shaganda katalogni serverdan to'liq sync.
 * App ildizida bir marta mount qilinadi ([[SyncManager]]).
 */
export function useSync(): void {
  const online = useOnline();
  const shopId = useActiveShopId();
  const qc = useQueryClient();
  const setCount = useOfflineStore((s) => s.setCount);
  const setSyncing = useOfflineStore((s) => s.setSyncing);
  const setResult = useOfflineStore((s) => s.setResult);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOnline = useRef(online);

  const run = useCallback(async () => {
    if (!shopId) return;
    setSyncing(true);
    const res = await syncQueue(shopId).catch(() => null);
    setSyncing(false);
    if (!res) return;
    setResult(res);
    setCount(res.remaining);
    if (res.synced > 0) {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sell-search"] });
    }
    // Navbat bo'sh → server avtoritativ, katalogni to'liq yangilaymiz
    if (res.remaining === 0) {
      await syncProductsFromServer(shopId).catch(() => {});
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  }, [shopId, qc, setCount, setSyncing, setResult]);

  const scheduleRun = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void run();
    }, 800);
  }, [run]);

  // Reconnect (offline → online)
  useEffect(() => {
    if (online && !prevOnline.current) scheduleRun();
    prevOnline.current = online;
  }, [online, scheduleRun]);

  // Dastlabki sanoq + online bo'lsa dastlabki sync
  useEffect(() => {
    if (!shopId) return;
    unsyncedCount(shopId).then(setCount).catch(() => {});
    if (online) scheduleRun();
  }, [shopId, online, scheduleRun, setCount]);

  // AppState active
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && online) scheduleRun();
    });
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [online, scheduleRun]);
}

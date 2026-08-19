import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { create } from "zustand";

import { logError } from "@/lib/logger";
import { useActiveShopId } from "@/features/auth/use-memberships";

import { drainPrintQueue } from "./print-queue-runner";
import { pendingJobCount, recoverPrintQueue } from "./print-queue-db";

/** Chiqmay qolgan cheklar soni — sozlama ekranidagi belgi uchun. */
interface PrintQueueState {
  count: number;
  setCount: (n: number) => void;
}

export const usePrintQueueStore = create<PrintQueueState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

/**
 * Chop etish navbati orkestratsiyasi — `use-sync.ts` naqshi. App ildizida
 * bir marta mount qilinadi (`SyncManager`).
 *
 * Drenaj UCH nuqtada boshlanadi:
 *  1. mount (tiklashdan keyin)
 *  2. ilova old planga chiqqanda — kassir printerni yoqib qaytgan holat
 *  3. qo'lda (`retryPrintQueue`, sozlama ekranidagi tugma)
 *
 * ⚠️ Printer HOLATI o'zgarganda drenaj boshlanmaydi: chop etishning o'zi
 * holatni `connected` ga o'tkazadi va bu qayta-qayta drenajga olib kelardi.
 */
export function usePrintQueue(): void {
  const shopId = useActiveShopId();
  const setCount = usePrintQueueStore((s) => s.setCount);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    if (!shopId) return;
    const res = await drainPrintQueue(shopId).catch((e) => {
      logError("print.queue.run", e);
      return null;
    });
    if (res) setCount(res.remaining);
  }, [shopId, setCount]);

  const scheduleRun = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), 800);
  }, [run]);

  // Ilova ishga tushdi: yarim yo'lda qolgan ishlarni tiklash + eskilarini tozalash.
  // Faqat SHUNDAN KEYIN drenaj boshlanadi, aks holda `printing` da qolgan ish
  // tiklanmasdan qayta chiqib ketishi mumkin edi.
  useEffect(() => {
    let cancelled = false;
    recoverPrintQueue()
      .catch((e) => logError("print.queue.recover", e))
      .finally(() => {
        if (!cancelled) scheduleRun();
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleRun]);

  // Dastlabki sanoq
  useEffect(() => {
    if (!shopId) return;
    pendingJobCount(shopId)
      .then(setCount)
      .catch((e) => logError("print.queue.initialCount", e));
  }, [shopId, setCount]);

  // Old planga qaytish — kassir printerni yoqib kelgan bo'lishi mumkin.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") scheduleRun();
    });
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleRun]);
}

/** Qo'lda qayta urinish (sozlama ekrani). Sanoqni ham yangilaydi. */
export async function retryPrintQueue(shopId: string): Promise<void> {
  const res = await drainPrintQueue(shopId);
  usePrintQueueStore.getState().setCount(res.remaining);
}

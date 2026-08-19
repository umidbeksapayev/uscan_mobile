import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useActiveShopId } from "@/features/auth/use-memberships";
import { useCart } from "@/features/sell/cart-store";
import type { Product } from "@/types/database";

import { resolveScan, type ScanOutcome } from "./scan-pipeline";
import { shouldAcceptScan, type ScanGate } from "./scan-dedup";

/**
 * Skanerlash ishlovchisi — kamera ham, HID skaner ham (B7) SHU hook'ni
 * ishlatadi. Manba faqat kodni beradi.
 *
 * ⚠️ Bu yerda SOBIT KECHIKISH YO'Q. Ilgari har skandan keyin 900ms qulf
 * qo'yilardi va u boshqa mahsulotni ham to'sardi (P1-4). Endi:
 *  - takror kadrlar `scan-dedup.ts` bilan filtrlanadi (kod kadrni tark
 *    etganda qayta faollashadi)
 *  - `busy` faqat lookup DAVOMIDA ushlab turadi (odatda <100ms, keshdan)
 * Holat xabari esa faqat KO'RINISH — u skanerlashni to'smaydi.
 */

export interface ScanStatus {
  text: string;
  tone: "ok" | "error" | "info";
}

/** Xabar ekranda turadigan vaqt — skanerlashga TA'SIR QILMAYDI. */
const STATUS_MS = { ok: 900, error: 1600, info: 600 } as const;

export interface ScanHandler {
  /** Kodni qayta ishlaydi (fire-and-forget). */
  handleScan: (raw: string) => void;
  status: ScanStatus | null;
  /** Lookup ketayotgani — spinner uchun. */
  busy: boolean;
}

export interface ScanHandlerOptions {
  /** VAZN mahsulot topilganda (odatda navigatsiya). */
  onWeight?: (product: Product) => void;
  /**
   * Har natija uchun — chaqiruvchi qo'shimcha reaksiya bersin.
   * Sotuv ekrani buni qidiruv maydonini tozalash uchun ishlatadi:
   * kod mahsulotga aylansa maydon tozalanadi, aks holda matn QOLADI
   * (foydalanuvchi nima yozilganini ko'rsin).
   */
  onResult?: (outcome: ScanOutcome) => void;
}

export function useScanHandler(opts?: ScanHandlerOptions): ScanHandler {
  const { t } = useTranslation();
  const shopId = useActiveShopId();
  const add = useCart((s) => s.add);
  const setPendingWeight = useCart((s) => s.setPendingWeight);

  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const gate = useRef<ScanGate | null>(null);
  const resolving = useRef(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `onWeight` ni ref'da ushlaymiz: chaqiruvchi uni har renderda yangi
  // funksiya sifatida bersa ham `handleScan` barqaror qoladi (kamera
  // `useCodeScanner` uni har o'zgarishda qayta yaratardi).
  const onWeight = useRef(opts?.onWeight);
  const onResult = useRef(opts?.onResult);
  // Yozish EFFEKTDA: render paytida ref o'zgartirish React qoidasini buzadi
  // (concurrent rejimida render qayta ishga tushishi mumkin).
  useEffect(() => {
    onWeight.current = opts?.onWeight;
    onResult.current = opts?.onResult;
  });

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  const showStatus = useCallback((next: ScanStatus) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus(next);
    statusTimer.current = setTimeout(() => setStatus(null), STATUS_MS[next.tone]);
  }, []);

  const apply = useCallback(
    (outcome: ScanOutcome) => {
      onResult.current?.(outcome);
      switch (outcome.kind) {
        case "unit":
          // Miqdor mantiqi SAVATDA (`cart-store.add` mavjudga +1 qiladi) —
          // skaner faqat "shu mahsulot skanerlandi" deb xabar beradi.
          add(outcome.product);
          showStatus({ text: `${outcome.product.name} · ${t("sell.addedToCart")}`, tone: "ok" });
          return;
        case "weight":
          setPendingWeight(outcome.product);
          onWeight.current?.(outcome.product);
          return;
        case "not-found":
          showStatus({
            text: t("scanner.notFound", { code: outcome.code }),
            tone: "error",
          });
          return;
        case "invalid":
          showStatus({ text: t("scanner.invalidCode", "Kod o'qilmadi"), tone: "error" });
          return;
        default:
          showStatus({ text: t("common.loadError"), tone: "error" });
      }
    },
    [add, setPendingWeight, showStatus, t],
  );

  const handleScan = useCallback(
    (raw: string) => {
      const now = Date.now();
      const accepted = shouldAcceptScan(raw, gate.current, now);
      // Kadr KO'RILGANI har doim qayd etiladi — "tanaffus" shu bilan o'lchanadi.
      gate.current = { code: raw, seenAt: now };

      if (!accepted || resolving.current || !shopId) return;

      resolving.current = true;
      setBusy(true);
      void resolveScan(raw, shopId)
        .then(apply)
        .finally(() => {
          resolving.current = false;
          setBusy(false);
        });
    },
    [apply, shopId],
  );

  return { handleScan, status, busy };
}

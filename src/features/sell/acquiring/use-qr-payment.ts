import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { processSaleRpc, type SaleResult } from "../checkout";
import {
  createPaymentIntent,
  getIntentStatus,
  markIntentFinalized,
} from "./acquiring-api";
import { mapIntentStatus, type AcquiringStatus } from "./acquiring-status";

const TIMEOUT_MS = 120_000;

/**
 * QR to'lov: intent yaratadi → 2s polling → paid → processSaleRpc (idempotent
 * client_id) + markIntentFinalized → onPaid. 120s timeout. Faqat `enabled`
 * (sheet ochiq) bo'lganda ishlaydi.
 * ⚠️ Payme sandbox kutadi — uchма-uch sinab bo'lmaydi.
 */
export function useQrPayment(args: {
  shopId: string;
  items: { product_id: string; quantity: number }[];
  amount: number;
  clientId: string;
  enabled: boolean;
  onPaid: (res: SaleResult) => void;
}) {
  const { shopId, items, amount, clientId, enabled, onPaid } = args;
  const [intentId, setIntentId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AcquiringStatus>("idle");
  const finalizing = useRef(false);

  // Intent yaratish (sheet ochilganda)
  useEffect(() => {
    if (!enabled) {
      setIntentId(null);
      setPayUrl(null);
      setStatus("idle");
      finalizing.current = false;
      return;
    }
    let cancelled = false;
    setStatus("pending");
    createPaymentIntent({ shopId, items, amount, searchMethod: "manual", clientId })
      .then((r) => {
        if (cancelled) return;
        setIntentId(r.intentId);
        setPayUrl(r.payUrl);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, shopId, clientId, amount, items]);

  // Polling
  const { data } = useQuery({
    queryKey: ["acquiring-status", intentId],
    queryFn: () => getIntentStatus(intentId as string),
    enabled: enabled && !!intentId && status === "pending",
    refetchInterval: 2000,
  });

  // Holat → paid'da yakunlash
  useEffect(() => {
    if (!data || !intentId) return;
    const s = mapIntentStatus(data.status);
    if (s === "paid" && !finalizing.current) {
      finalizing.current = true;
      processSaleRpc({ shopId, items, clientId })
        .then(async (res) => {
          await markIntentFinalized(intentId).catch(() => {});
          setStatus("paid");
          onPaid(res);
        })
        .catch(() => {
          // To'lov o'tdi, lekin sotuv yozilmadi → finalize qilmaymiz (reconciliation).
          setStatus("paid");
          onPaid({
            sale_id: `qr-${clientId}`,
            item_count: items.length,
            total_revenue: amount,
            total_profit: 0,
            paid_amount: amount,
            debt: 0,
          });
        });
    } else if (s !== "pending") {
      setStatus(s);
    }
  }, [data, intentId, shopId, items, clientId, amount, onPaid]);

  // Timeout
  useEffect(() => {
    if (!enabled || status !== "pending") return;
    const t = setTimeout(() => setStatus("timeout"), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [enabled, status]);

  return { status, payUrl };
}

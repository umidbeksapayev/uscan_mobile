import { useCallback, useEffect, useRef } from "react";

import { isBurstInProgress, isScannerBurst } from "./hid-parse";
import { useScannerStore } from "./scanner-settings";

/**
 * Oddiy matn maydonini SKANER-XABARDOR qiladi.
 *
 * ⚠️ Nima uchun ko'rinmas maydon EMAS: qurilmadagi sinov shuni ko'rsatdiki,
 * Android apparat klaviaturasidan (HID skaner) kelgan kiritishni ekrandagi
 * BIRINCHI matn maydoniga yo'naltiradi. Ko'rinmas maydonni fokusda ushlab
 * turishga urinish ikki tomonlama yomon:
 *  - Android bilan fokus talashish qurilmadan qurilmaga har xil ishlaydi;
 *  - g'alaba qozonsak ham, kassir qidiruvga yozganda harflar yo'qolardi.
 *
 * Shuning uchun teskarisini qilamiz: kiritish QAYERGA tushsa o'sha yerda
 * taniymiz.
 *
 * ⚠️ Maydonga matnni HOOK yozadi (`onText`), chaqiruvchi emas. Sabab:
 * skanerdan kelayotgan kod ekranda KO'RINMASLIGI kerak (POS'da shtrix-kod
 * ko'rinib o'tishi "xom" taassurot beradi). Kod mahsulotga aylanmasa esa
 * matn maydonga QAYTARILADI — kassir nima skanerlanganini ko'rsin.
 */

/** Terminatorsiz skaner uchun: yozuv to'xtaganini kutish. */
const IDLE_MS = 160;

export interface ScanDetectOptions {
  /** Tayyor shtrix-kod. */
  onScan: (code: string) => void;
  /** Maydonda KO'RINISHI kerak bo'lgan matn. */
  onText: (text: string) => void;
}

export interface ScanDetect {
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  /**
   * Kod mahsulotga aylanmadi — matnni maydonga qaytaramiz.
   * Chaqiruvchi buni `not-found` natijasida ishlatadi.
   */
  restore: (code: string) => void;
}

export function useScanDetect(opts: ScanDetectOptions): ScanDetect {
  const enabled = useScannerStore((s) => s.externalScanner);

  const firstAt = useRef(0);
  const buffer = useRef("");
  /** Matn ekranda ko'rsatilmayapti (skaner oqimi davom etmoqda). */
  const hidden = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cb = useRef(opts);
  useEffect(() => {
    cb.current = opts;
  });

  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );

  const reset = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    buffer.current = "";
    firstAt.current = 0;
    hidden.current = false;
  }, []);

  /** Bufer tugadi — skanermi yoki oddiy matnmi, hal qilamiz. */
  const settle = useCallback(() => {
    const value = buffer.current.trim();
    const elapsed = Date.now() - firstAt.current;
    const wasHidden = hidden.current;
    reset();

    if (isScannerBurst(value.length, elapsed)) {
      cb.current.onScan(value);
      return;
    }
    // Skaner emas ekan — yashirgan bo'lsak matnni ko'rsatamiz.
    if (wasHidden) cb.current.onText(value);
  }, [reset]);

  const onChangeText = useCallback(
    (next: string) => {
      if (!enabled) {
        cb.current.onText(next);
        return;
      }
      if (next.length === 0) {
        reset();
        cb.current.onText("");
        return;
      }

      const now = Date.now();
      const jump = next.length - buffer.current.length;
      if (buffer.current.length === 0) firstAt.current = now;
      buffer.current = next;

      const burst = isBurstInProgress(next.length, jump, now - firstAt.current);
      // Bir marta yashirilgach oxirigacha yashirin qoladi: skaner kodni
      // bo'laklab yuborsa, oxirgi bo'lak sekin kelib "ko'rinsin" degan
      // qarorga o'tib ketardi va kod yarim ko'rinardi.
      hidden.current = hidden.current || burst;
      if (!hidden.current) cb.current.onText(next);

      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(settle, IDLE_MS);
    },
    [enabled, reset, settle],
  );

  const onSubmitEditing = useCallback(() => {
    if (!enabled) return;
    if (idle.current) clearTimeout(idle.current);
    settle();
  }, [enabled, settle]);

  const restore = useCallback((code: string) => {
    cb.current.onText(code);
  }, []);

  return { onChangeText, onSubmitEditing, restore };
}

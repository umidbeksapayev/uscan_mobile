import { create } from "zustand";

import { logError } from "@/lib/logger";
import type { PrintDocument, PrinterKind, PrinterTarget, PrinterTransport } from "./transport";
import {
  backoffMs,
  classifyPrintError,
  shouldForceReconnect,
  shouldRetryPrint,
  type PrinterStatus,
  type PrintErrorKind,
} from "./printer-state";
import { bluetoothTransport } from "./transports/bluetooth";
import { systemTransport } from "./transports/system";

/**
 * PrinterManager — printer ulanishining YAGONA egasi.
 *
 * Nima uchun kerak: ilgari har chek `ensureConnected()` bilan boshlanardi va
 * xato bo'lsa chek shu yerda YO'QOLARDI (qayta urinish yo'q edi). Endi:
 *  - ulanish sessiya davomida saqlanadi (har chekda qayta ulanmaydi)
 *  - uzilish aniqlanadi → majburan uzib, qayta ulanadi → qayta uriniladi
 *  - eksponensial backoff, `MAX_PRINT_ATTEMPTS` bilan cheklangan (cheksiz emas)
 *  - holat kuzatiladi (`usePrinterManager`) → sozlama ekranida ko'rinadi
 *
 * Qaror mantiqi bu yerda EMAS — `printer-state.ts` da (sof, test qilinadi).
 * Bu fayl faqat o'sha qarorlarni bajaradi.
 */

/** Kelajakdagi `network` B8 da qo'shiladi — yo'qligi aniq xato beradi. */
const TRANSPORTS: Partial<Record<PrinterKind, PrinterTransport>> = {
  bluetooth: bluetoothTransport,
  system: systemTransport,
};

export type PrintOutcome =
  | { ok: true }
  | { ok: false; kind: PrintErrorKind; message: string };

interface PrinterManagerState {
  status: PrinterStatus;
  /** Faol nishon — sozlamada tanlangani (`printer-settings.ts`) bilan bir xil. */
  target: PrinterTarget | null;
  /** Oxirgi xatoning TEXNIK matni (developer uchun; UI'ga xom chiqarilmaydi). */
  lastError: string | null;
  lastErrorKind: PrintErrorKind | null;
  _set: (patch: Partial<Omit<PrinterManagerState, "_set">>) => void;
}

export const usePrinterManager = create<PrinterManagerState>((set) => ({
  status: "disconnected",
  target: null,
  lastError: null,
  lastErrorKind: null,
  _set: (patch) => set(patch),
}));

function setState(patch: Partial<Omit<PrinterManagerState, "_set">>): void {
  usePrinterManager.getState()._set(patch);
}

function transportFor(target: PrinterTarget): PrinterTransport {
  const t = TRANSPORTS[target.kind];
  if (!t) throw new Error(`Printer turi qo'llab-quvvatlanmaydi: ${target.kind}`);
  return t;
}

/** Nishon o'zgardimi (boshqa printer tanlandi) — eskisini uzish kerak. */
function sameTarget(a: PrinterTarget | null, b: PrinterTarget): boolean {
  return !!a && a.kind === b.kind && a.address === b.address;
}

// ── Ketma-ketlik ────────────────────────────────────────────────────────────
//
// Printer bir vaqtda BITTA yozuvni qabul qiladi. Ikki chek parallel yuborilsa
// baytlar aralashib, ikkalasi ham buzilib chiqadi. Shuning uchun barcha
// amallar bitta promise zanjirida ketma-ket bajariladi.
//
// Zanjir XATODAN keyin ham davom etadi (`.catch`) — bitta muvaffaqiyatsiz chek
// keyingi hamma chekni abadiy bloklab qo'ymasligi kerak.

let chain: Promise<unknown> = Promise.resolve();

function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ── Ulanish ─────────────────────────────────────────────────────────────────

async function ensureConnected(target: PrinterTarget): Promise<void> {
  const transport = transportFor(target);
  const state = usePrinterManager.getState();

  // Boshqa printerga o'tildi — eskisini uzamiz (BT stack'da osilib qolmasin).
  if (state.target && !sameTarget(state.target, target)) {
    await transportFor(state.target)
      .disconnect(state.target)
      .catch((e) => logError("print.manager.switchDisconnect", e));
    setState({ status: "disconnected" });
  }

  if (state.status === "connected" && sameTarget(state.target, target)) {
    // Transport o'zi tekshira olsa — ishonamiz-u, tekshiramiz: BT uxlab
    // qolganda bizning holatimiz eskirgan bo'lishi mumkin.
    const live = await transport.isConnected?.(target);
    if (live !== false) return;
  }

  setState({ status: "connecting", target });
  await transport.connect(target);
  setState({ status: "connected", target, lastError: null, lastErrorKind: null });
}

/** Ulanishni majburan uzadi (xato yutiladi) — qayta ulanishdan oldin. */
async function forceDisconnect(target: PrinterTarget): Promise<void> {
  await transportFor(target)
    .disconnect(target)
    .catch((e) => logError("print.manager.forceDisconnect", e));
  setState({ status: "disconnected" });
}

// ── Ommaviy API ─────────────────────────────────────────────────────────────

/**
 * Hujjatni chop etadi. XATO ULOQTIRMAYDI — natijani qaytaradi, chunki chaqiruvchi
 * (chek/yorliq) uchun "chiqmadi" bu oqimni to'xtatadigan hodisa emas.
 */
export function printDocument(doc: PrintDocument, target: PrinterTarget): Promise<PrintOutcome> {
  return serial(async () => {
    let attempt = 0;

    for (;;) {
      attempt++;
      try {
        await ensureConnected(target);
        setState({ status: "printing" });
        await transportFor(target).write(doc, target);
        setState({ status: "connected", lastError: null, lastErrorKind: null });
        return { ok: true } as PrintOutcome;
      } catch (e) {
        const kind = classifyPrintError(e);
        const message = e instanceof Error ? e.message : String(e);

        // Bekor qilish xato emas — jurnalga ham yozilmaydi.
        if (kind === "cancelled") {
          setState({ status: "disconnected" });
          return { ok: false, kind, message } as PrintOutcome;
        }

        logError(`print.manager.attempt${attempt}`, e);

        if (shouldForceReconnect(kind)) await forceDisconnect(target);
        else setState({ status: "error" });

        if (!shouldRetryPrint(attempt, kind)) {
          setState({ status: "error", lastError: message, lastErrorKind: kind });
          return { ok: false, kind, message } as PrintOutcome;
        }

        await sleep(backoffMs(attempt));
      }
    }
  });
}

/** Sozlama ekranidagi "Qayta ulanish" tugmasi uchun. */
export function connectPrinter(target: PrinterTarget): Promise<PrintOutcome> {
  return serial(async () => {
    try {
      await forceDisconnect(target);
      await ensureConnected(target);
      return { ok: true } as PrintOutcome;
    } catch (e) {
      const kind = classifyPrintError(e);
      const message = e instanceof Error ? e.message : String(e);
      logError("print.manager.connect", e);
      setState({ status: "error", lastError: message, lastErrorKind: kind });
      return { ok: false, kind, message } as PrintOutcome;
    }
  });
}

/**
 * Ulanishni yopadi va holatni tozalaydi — printer almashtirilganda,
 * do'kondan chiqishda va ilova yopilishida.
 */
export function disconnectPrinter(): Promise<void> {
  return serial(async () => {
    const { target } = usePrinterManager.getState();
    if (target) await forceDisconnect(target);
    setState({ status: "disconnected", target: null, lastError: null, lastErrorKind: null });
  });
}

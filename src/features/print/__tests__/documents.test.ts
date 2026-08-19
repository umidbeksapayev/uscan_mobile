/**
 * `documents.ts` `printer-settings.ts` orqali `@/lib/offline/mmkv`ga bog'liq —
 * shu sabab bu yerda ham xotiradagi soxta `storage` beriladi
 * (`printer-settings.test.ts`dagi bilan bir xil naqsh: xotira `Map`si
 * `jest.mock` factory FUNKSIYASI ICHIDA yaratiladi va mock ob'ektining o'zida
 * `__mem` sifatida e'lon qilinadi — shu bilan importlar odatdagidek fayl
 * boshida qoladi, `import/first` buzilmaydi).
 */
import { storage } from "@/lib/offline/mmkv";
import { usePrinterStore } from "../printer-settings";
import { receiptDocument } from "../documents";
import type { ReceiptData } from "../types";

jest.mock("@/lib/offline/mmkv", () => {
  const mem = new Map<string, string>();
  return {
    storage: {
      getString: (k: string) => mem.get(k),
      set: (k: string, v: string) => {
        mem.set(k, v);
      },
      __mem: mem,
    },
  };
});

const data: ReceiptData = {
  shopName: "Dilshod Market",
  saleId: "offline-abcdef12-3456",
  soldAt: "2026-06-26T09:18:00.000Z",
  items: [{ name: "Non", saleType: "unit", quantity: 2, unitPrice: 3000, lineTotal: 6000 }],
  totalRevenue: 6000,
  paymentMethod: "Naqd",
  givenAmount: 10000,
  changeAmount: 4000,
};

function asciiOf(b: Uint8Array): string {
  return Array.from(b)
    .filter((n) => n >= 32 && n <= 126)
    .map((n) => String.fromCharCode(n))
    .join("");
}

beforeEach(() => {
  (storage as unknown as { __mem: Map<string, string> }).__mem.clear();
  usePrinterStore.setState({ type: "system", btAddress: null, btName: null, codepage: "cp866", paperWidth: 58 });
});

describe("receiptDocument — to'liq oqim (store → encoder/html)", () => {
  it("paperWidth=58 (default): ESC-POS divider 32, HTML 58mm", () => {
    const doc = receiptDocument(data);
    expect(asciiOf(doc.escpos())).toContain("-".repeat(32));
    expect(doc.html()).toContain("width: 58mm");
  });

  it("paperWidth=80 (store orqali): ESC-POS divider 48, HTML 80mm", () => {
    usePrinterStore.getState().setPaperWidth(80);
    const doc = receiptDocument(data);
    expect(asciiOf(doc.escpos())).toContain("-".repeat(48));
    expect(doc.html()).toContain("width: 80mm");
  });
});

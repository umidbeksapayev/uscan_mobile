import { PermissionsAndroid, Platform } from "react-native";
import {
  BluetoothManager,
  BluetoothEscposPrinter,
  ALIGN,
  type BluetoothDevice,
} from "tp-react-native-bluetooth-printer";

import { formatNumber, formatDateTimeFull } from "@/lib/format";
import { sanitize } from "./escpos-encoder";
import type { ReceiptData, ReceiptLine } from "./types";

const WIDTH = 32; // 58mm, Font A
const NL = "\r\n";

/** Android 12+ runtime BT ruxsatlari (eski versiyalarda — location). */
export async function requestBtPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted = [P.BLUETOOTH_CONNECT, P.BLUETOOTH_SCAN, P.ACCESS_FINE_LOCATION];
  try {
    const res = await PermissionsAndroid.requestMultiple(wanted);
    return Object.values(res).some((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
}

function normalizeScan(res: unknown): BluetoothDevice[] {
  const parsed = typeof res === "string" ? JSON.parse(res) : res;
  const p = (parsed ?? {}) as { paired?: BluetoothDevice[]; found?: BluetoothDevice[] };
  const all = [...(p.paired ?? []), ...(Array.isArray(parsed) ? (parsed as BluetoothDevice[]) : []), ...(p.found ?? [])];
  // address bo'yicha dedup
  const seen = new Set<string>();
  return all.filter((d) => d?.address && !seen.has(d.address) && seen.add(d.address));
}

/** Ulangan/yaqin Bluetooth qurilmalar (sozlama ekrani uchun). */
export async function listBluetoothDevices(): Promise<BluetoothDevice[]> {
  await requestBtPermissions();
  const enabled = await BluetoothManager.isBluetoothEnabled();
  if (!enabled) {
    const paired = await BluetoothManager.enableBluetooth();
    if (Array.isArray(paired)) return normalizeScan({ paired });
  }
  const res = await BluetoothManager.scanDevices();
  return normalizeScan(res);
}

function itemLeft(it: ReceiptLine): string {
  return it.saleType === "weight" ? `${it.name} ${it.quantity.toFixed(3)}kg` : `${it.name} x${it.quantity}`;
}

function shortId(id: string): string {
  const clean = id.replace(/^offline-/, "").replace(/^qr-/, "");
  return clean.length > 8 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
}

async function row(left: string, right: string) {
  await BluetoothEscposPrinter.printColumn(
    [WIDTH - 10, 10],
    [ALIGN.LEFT, ALIGN.RIGHT],
    [sanitize(left), sanitize(right)],
    {},
  );
}

async function text(s: string) {
  await BluetoothEscposPrinter.printText(sanitize(s) + NL, {});
}

/** ESC-POS Bluetooth termal printerga chek chiqarish (yuqori-darajali lib API). */
export async function printReceiptBluetooth(data: ReceiptData, address: string): Promise<void> {
  await BluetoothManager.connect(address);
  await BluetoothEscposPrinter.printerInit();

  await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);
  await BluetoothEscposPrinter.setBold(1);
  await text(data.shopName);
  await BluetoothEscposPrinter.setBold(0);
  if (data.shopPhone) await text(`Tel: ${data.shopPhone}`);
  if (data.shopAddress) await text(data.shopAddress);

  await BluetoothEscposPrinter.printerAlign(ALIGN.LEFT);
  await text("-".repeat(WIDTH));
  await text(`Chek #${shortId(data.saleId)}`);
  await text(formatDateTimeFull(data.soldAt));
  if (data.cashierName) await text(`Kassir: ${data.cashierName}`);
  await text("-".repeat(WIDTH));

  for (const it of data.items) {
    await row(itemLeft(it), formatNumber(it.lineTotal));
  }
  await text("-".repeat(WIDTH));

  await BluetoothEscposPrinter.setBold(1);
  await row("JAMI", `${formatNumber(data.totalRevenue)} so'm`);
  await BluetoothEscposPrinter.setBold(0);
  await row("To'lov", data.paymentMethod);
  if (data.paymentMethod === "Naqd" && data.givenAmount != null) {
    await row("Berilgan", formatNumber(data.givenAmount));
    await row("Qaytim", formatNumber(data.changeAmount ?? 0));
  }
  if (data.debtAmount != null && data.debtAmount > 0) {
    await row("Nasiyaga", formatNumber(data.debtAmount));
    if (data.customerName) await row("Mijoz", data.customerName);
  }

  await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);
  await text("");
  await text("Rahmat! Xayrli kun!");
  await BluetoothEscposPrinter.printAndFeed(3);
  // Kesish — printer qo'llab-quvvatlamasa jim o'tkazamiz
  try {
    await BluetoothEscposPrinter.cutLine(1);
  } catch {
    /* cutter yo'q */
  }
}

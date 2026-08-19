import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { encode as encodeBase64 } from "base64-arraybuffer";

import { logError } from "@/lib/logger";
import type { PrintDocument, PrinterTarget, PrinterTransport } from "../transport";
import { requireAddress } from "../transport";

/**
 * Bluetooth Classic (SPP) transporti — `react-native-bluetooth-classic` ustidagi
 * YAGONA qatlam. Kutubxona nomi bu fayldan tashqariga chiqmaydi.
 *
 * ⚠️ Kutubxona `rc` versiyada (`1.73.0-rc.17`). Almashtirish kerak bo'lsa
 * o'zgaradigan yagona fayl — shu.
 */

export type BtDevice = { name: string; address: string };

/** Android 12+ runtime BT ruxsatlari (eski versiyalarda — location). */
export async function requestBtPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const P = PermissionsAndroid.PERMISSIONS;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      P.BLUETOOTH_CONNECT,
      P.BLUETOOTH_SCAN,
      P.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(res).some((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) {
    logError("print.bt.permissions", e);
    return false;
  }
}

/** Ulangan (paired) Bluetooth qurilmalar — sozlama ekrani uchun. */
export async function listBluetoothDevices(): Promise<BtDevice[]> {
  await requestBtPermissions();
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    await RNBluetoothClassic.requestBluetoothEnabled().catch((e) =>
      logError("print.bt.enable", e),
    );
  }
  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((d) => ({ name: d.name, address: d.address }));
}

/**
 * `Uint8Array` → base64. `buffer` ni to'g'ridan-to'g'ri bermaymiz: view
 * boshqa buferning BO'LAGI bo'lishi mumkin (`byteOffset > 0`), u holda
 * butun bufer kodlanib, printerga ortiqcha baytlar ketardi.
 */
function toBase64(bytes: Uint8Array): string {
  const slice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return encodeBase64(slice as ArrayBuffer);
}

export const bluetoothTransport: PrinterTransport = {
  kind: "bluetooth",

  async connect(target: PrinterTarget): Promise<void> {
    const address = requireAddress(target);
    let connected = false;
    try {
      connected = await RNBluetoothClassic.isDeviceConnected(address);
    } catch (e) {
      // Holatni aniqlay olmadik — ulanishga urinib ko'ramiz (xato yutilmaydi,
      // menejer uni tasniflaydi).
      logError("print.bt.isConnected", e);
    }
    if (!connected) await RNBluetoothClassic.connectToDevice(address);
  },

  async write(doc: PrintDocument, target: PrinterTarget): Promise<void> {
    const address = requireAddress(target);
    await RNBluetoothClassic.writeToDevice(address, toBase64(doc.escpos()), "base64");
  },

  async disconnect(target: PrinterTarget): Promise<void> {
    if (!target.address) return;
    try {
      await RNBluetoothClassic.disconnectFromDevice(target.address);
    } catch (e) {
      // Uzish hech qachon chaqiruvchini to'xtatmaydi — allaqachon uzilgan
      // bo'lishi ham normal holat.
      logError("print.bt.disconnect", e);
    }
  },

  async isConnected(target: PrinterTarget): Promise<boolean> {
    if (!target.address) return false;
    try {
      return await RNBluetoothClassic.isDeviceConnected(target.address);
    } catch {
      return false;
    }
  },
};

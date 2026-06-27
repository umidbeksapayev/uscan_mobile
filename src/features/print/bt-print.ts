import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { encode as encodeBase64 } from "base64-arraybuffer";

import { encodeReceipt } from "./escpos-encoder";
import type { ReceiptData } from "./types";

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
  } catch {
    return false;
  }
}

/** Ulangan (paired) Bluetooth qurilmalar — sozlama ekrani uchun. */
export async function listBluetoothDevices(): Promise<BtDevice[]> {
  await requestBtPermissions();
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) await RNBluetoothClassic.requestBluetoothEnabled().catch(() => {});
  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((d) => ({ name: d.name, address: d.address }));
}

function bytesToBase64(bytes: number[]): string {
  const arr = new Uint8Array(bytes);
  return encodeBase64(arr.buffer);
}

/**
 * ESC-POS termal printerga chek chiqarish — raw baytlar (encodeReceipt) base64
 * orqali SPP'ga yoziladi. Yuqori-darajali lib API'siga bog'lanmaymiz.
 */
export async function printReceiptBluetooth(data: ReceiptData, address: string): Promise<void> {
  // Ulangan bo'lmasa ulaymiz (allaqachon ulangan bo'lsa jim o'tkazamiz)
  try {
    const connected = await RNBluetoothClassic.isDeviceConnected(address);
    if (!connected) await RNBluetoothClassic.connectToDevice(address);
  } catch {
    await RNBluetoothClassic.connectToDevice(address);
  }
  const base64 = bytesToBase64(encodeReceipt(data));
  await RNBluetoothClassic.writeToDevice(address, base64, "base64");
}

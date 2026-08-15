import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";
import { uuidv4 } from "@/lib/uuid";

const BUCKET = "payment-receipts";

/** Maksimal fayl hajmi (talab #4 — "oqilona limit"). */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Rasm uchun maksimal yon — chek matni o'qilishi kerak, shuning uchun
 *  mahsulot rasmidan (1024px/0.6) kattaroq va sifatliroq. */
const MAX_IMAGE_SIZE = 1600;

export type ReceiptSource = "camera" | "library" | "file";

export interface PickedReceipt {
  /** Lokal URI — oldindan ko'rish (preview) uchun. */
  uri: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  ext: string;
  isPdf: boolean;
  /** Yuklashga tayyor ma'lumot (rasm siqilgandan keyin). */
  data: ArrayBuffer;
}

export type ReceiptErrorCode = "too_large" | "bad_format" | "read_failed";

export class ReceiptError extends Error {
  constructor(public code: ReceiptErrorCode) {
    super(code);
    this.name = "ReceiptError";
  }
}

const ALLOWED_IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];

function extFromName(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

/**
 * Rasmni kichraytirib JPEG'ga siqadi. `products/upload-image.ts` bilan bir
 * xil yondashuv — farqi faqat o'lcham/sifat (chek matni o'qilishi shart).
 */
async function compressImage(uri: string): Promise<{ data: ArrayBuffer; sizeBytes: number }> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: MAX_IMAGE_SIZE });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new ReceiptError("read_failed");

  const data = decode(out.base64);
  return { data, sizeBytes: data.byteLength };
}

/**
 * Chekni tanlaydi: kamera / galereya (rasm) yoki fayl (PDF ham).
 * Bekor qilinsa `null`.
 *
 * Yuklash ATAYLAB alohida qadam (`uploadReceipt`) — foydalanuvchi avval
 * preview'ni ko'rib, "o'chirish / qayta yuklash" qila olishi kerak
 * (talab #4), tarmoqqa esa faqat "Yuborish" bosilganda chiqiladi.
 */
export async function pickReceipt(source: ReceiptSource): Promise<PickedReceipt | null> {
  if (source === "file") {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;

    const a = res.assets[0];
    const name = a.name ?? "chek";
    const ext = extFromName(name) || (a.mimeType === "application/pdf" ? "pdf" : "jpg");
    const isPdf = ext === "pdf" || a.mimeType === "application/pdf";
    if (!isPdf && !ALLOWED_IMAGE_EXT.includes(ext)) throw new ReceiptError("bad_format");

    // Tanlashdan OLDIN tekshiramiz — katta faylni o'qishga urinmaymiz.
    if ((a.size ?? 0) > MAX_RECEIPT_BYTES) throw new ReceiptError("too_large");

    if (isPdf) {
      // PDF siqilmaydi — bevosita o'qiymiz (base64 aylanmasi shart emas).
      let data: ArrayBuffer;
      try {
        data = await new File(a.uri).arrayBuffer();
      } catch {
        throw new ReceiptError("read_failed");
      }
      if (data.byteLength > MAX_RECEIPT_BYTES) throw new ReceiptError("too_large");
      return {
        uri: a.uri,
        name,
        sizeBytes: data.byteLength,
        mimeType: "application/pdf",
        ext: "pdf",
        isPdf: true,
        data,
      };
    }

    const { data, sizeBytes } = await compressImage(a.uri);
    return { uri: a.uri, name, sizeBytes, mimeType: "image/jpeg", ext: "jpg", isPdf: false, data };
  }

  const opts: ImagePicker.ImagePickerOptions = { quality: 1 };
  let res: ImagePicker.ImagePickerResult;

  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    res = await ImagePicker.launchCameraAsync(opts);
  } else {
    res = await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ["images"] });
  }

  const asset = res.assets?.[0];
  if (res.canceled || !asset) return null;

  const { data, sizeBytes } = await compressImage(asset.uri);
  // Siqilgandan keyin ham katta bo'lsa (juda katta panorama) — rad etamiz.
  if (sizeBytes > MAX_RECEIPT_BYTES) throw new ReceiptError("too_large");

  return {
    uri: asset.uri,
    name: asset.fileName ?? "chek.jpg",
    sizeBytes,
    mimeType: "image/jpeg",
    ext: "jpg",
    isPdf: false,
    data,
  };
}

/**
 * PRIVATE bucket'ga yuklaydi va STORAGE YO'LINI qaytaradi (public URL EMAS —
 * bucket yopiq; o'qish uchun `getReceiptSignedUrl` ishlatiladi).
 *
 * Yo'l: `{shopId}/{paymentId}/{uuid}.{ext}` — birinchi papka `shopId`,
 * Storage RLS aynan shuni tekshiradi (045_payments.sql).
 */
export async function uploadReceipt(
  file: PickedReceipt,
  shopId: string,
  paymentId: string,
): Promise<string> {
  const path = `${shopId}/${paymentId}/${uuidv4()}.${file.ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file.data, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.mimeType,
  });
  if (error) throw new Error(error.message);

  return path;
}

/** Inson o'qiy oladigan hajm ("1.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

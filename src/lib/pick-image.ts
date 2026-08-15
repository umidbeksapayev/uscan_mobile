import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { toast } from "@/lib/toast";

/** Maksimal yon (px) — katta telefon rasmlari yuklashdan oldin shu o'lchamga siqiladi. */
const MAX_SIZE = 1024;

export type ImageSource = "camera" | "library";

/**
 * Rasmni max 1024px ga kichraytirib, JPEG 0.6 sifatda siqib, base64 qaytaradi.
 * (ImagePicker `quality` faqat siqadi — piksel o'lchamini cheklamaydi; sekin
 * internetda yuklash osilmasligi uchun o'lchamni ham kamaytiramiz.)
 */
async function compressToBase64(uri: string): Promise<string | null> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: MAX_SIZE });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return out.base64 ?? null;
}

/**
 * Kameradan yoki galereyadan kvadrat rasm tanlab, siqib base64 qaytaradi
 * (bekor qilinsa `null`). YUKLAMAYDI — qayerga yuklash chaqiruvchiga bog'liq:
 * mahsulot rasmi `product-images/{shop_id}/…`, avatar esa
 * `avatars/{user_id}/…` ga tushadi.
 *
 * Ilgari bu mantiq `features/products/upload-image.ts` ichida edi va faqat
 * mahsulotga bog'langan edi — profil rasmi qo'shilganda nusxa ko'chirish
 * o'rniga shu yerga chiqarildi.
 */
export async function pickAndCompress(source: ImageSource): Promise<string | null> {
  // base64 OLMAYMIZ — avval manipulate bilan o'lchamni cheklab, keyin base64 olamiz.
  const opts: ImagePicker.ImagePickerOptions = {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };

  let res: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error("Ruxsat kerak", "Kameraga ruxsat bering.");
      return null;
    }
    res = await ImagePicker.launchCameraAsync(opts);
  } else {
    res = await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ["images"] });
  }

  const uri = res.assets?.[0]?.uri;
  if (res.canceled || !uri) return null;

  return compressToBase64(uri);
}

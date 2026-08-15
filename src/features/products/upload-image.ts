import { pickAndCompress, type ImageSource } from "@/lib/pick-image";
import { uploadProductImage } from "@/lib/storage";

/**
 * Kamera yoki galereyadan rasm tanlab, siqib mahsulot bucket'iga yuklaydi.
 * Public URL qaytaradi (yoki bekor qilinsa null).
 *
 * Tanlash/siqish mantiqi `lib/pick-image.ts` da — u profil rasmi bilan
 * umumiy (bu yerda faqat "qayerga yuklash" qismi qoladi).
 */
export async function pickAndUpload(
  source: ImageSource,
  shopId: string,
): Promise<string | null> {
  const base64 = await pickAndCompress(source);
  if (!base64) return null;
  return uploadProductImage(base64, shopId);
}

import { decode } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";
import { uuidv4 } from "@/lib/uuid";

const BUCKET = "product-images";

/**
 * base64 rasmni public bucket'ga yuklaydi → public URL.
 * Yo'l: "{shopId}/{uuid}.{ext}" — Storage RLS shop_id papkasini tekshiradi
 * (web lib/storage.ts bilan bir xil bucket va konvensiya).
 */
export async function uploadProductImage(
  base64: string,
  shopId: string,
  ext = "jpg",
  contentType = "image/jpeg",
): Promise<string> {
  const path = `${shopId}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  if (error) throw new Error(`Rasm yuklashda xato: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

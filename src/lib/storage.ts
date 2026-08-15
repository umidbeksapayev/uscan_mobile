import { decode } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";
import { uuidv4 } from "@/lib/uuid";

const BUCKET = "product-images";
/** Profil rasmlari (migration 046) — do'kon emas, USER papkasi bo'yicha RLS. */
const AVATAR_BUCKET = "avatars";

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

/**
 * Profil rasmini yuklaydi → public URL.
 * Yo'l: "{userId}/{uuid}.jpg" — Storage RLS birinchi papka `auth.uid()` ga
 * tengligini tekshiradi (046_profile.sql). Do'kon papkasi EMAS: avatar
 * odamga tegishli, do'konga emas.
 */
export async function uploadAvatar(base64: string, userId: string): Promise<string> {
  const path = `${userId}/${uuidv4()}.jpg`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, decode(base64), {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });
  if (error) throw new Error(`Rasm yuklashda xato: ${error.message}`);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Eski avatarni o'chiradi (yangisi yuklangach). Xato JUTILADI: rasm
 * almashdi, eski fayl qolib ketsa foydalanuvchi uchun hech narsa
 * o'zgarmaydi — buning uchun amalni to'xtatish noto'g'ri bo'lardi.
 */
export async function deleteAvatar(publicUrl: string): Promise<void> {
  const marker = `/${AVATAR_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return; // begona URL (masalan Google rasmi) — tegmaymiz
  const path = publicUrl.slice(i + marker.length);
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

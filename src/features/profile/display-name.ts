import type { Profile } from "@/types/database";

/**
 * Ekranda ko'rsatiladigan ism.
 *
 * Ism kiritilmagan bo'lsa email'ning "@" gacha qismi olinadi — bu bo'sh
 * joydan yoki xom emaildan ko'ra tanishroq ko'rinadi. Ikkalasi ham bo'lmasa
 * chaqiruvchi bergan zaxira matn (odatda "Foydalanuvchi").
 */
export function displayName(
  profile: Pick<Profile, "full_name"> | null | undefined,
  email: string | null | undefined,
  fallback = "Foydalanuvchi",
): string {
  const name = profile?.full_name?.trim();
  if (name) return name;

  const local = email?.split("@")[0]?.trim();
  if (local) return local;

  return fallback;
}

/**
 * Avatar uchun bosh harflar (rasm bo'lmaganda). Ikki so'zdan iborat ismda
 * ikkita harf ("Umidbek Sapayev" → "US"), aks holda bitta.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

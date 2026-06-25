import type { MemberRole, MemberPermissions, PermissionKey } from "@/types/database";

/**
 * Ruxsat tekshiruvi (sof funksiya). Ega → har doim true; kassir → faqat
 * yoqilgan ruxsat. DB tomonida `has_perm` bilan mos (bu faqat UX qatlami).
 * (Web membership.ts `canDo` ga mos.)
 */
export function canDo(
  role: MemberRole | undefined,
  permissions: MemberPermissions | undefined,
  perm: PermissionKey,
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return permissions?.[perm] === true;
}

/** Sozlama ekranida kassir uchun toggle qilinadigan ruxsatlar (tartib + yorliq). */
export const PERMISSION_LABELS: { key: PermissionKey; label: string; hint: string }[] = [
  { key: "manage_products", label: "Mahsulotlar", hint: "Mahsulot qo'shish/tahrirlash, kategoriyalar" },
  { key: "purchase", label: "Kirim / Ta'minot", hint: "Kirim qilish, tan narx kiritish" },
  { key: "returns", label: "Qaytarish", hint: "Sotuvni qaytarish" },
  { key: "manage_debt", label: "Nasiya", hint: "Nasiya daftari va qarz to'lovlari" },
  { key: "view_reports", label: "Hisobotlar", hint: "Statistika va savdo hisoboti" },
  { key: "view_cost", label: "Tan narx / foyda", hint: "Tan narxi va foydani ko'rish" },
];

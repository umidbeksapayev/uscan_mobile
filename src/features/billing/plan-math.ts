/**
 * Sof funksiyalar — obuna holatini UI uchun hisoblaydi. Supabase/hook'siz,
 * unit-test qilinadi (loyihadagi boshqa `-math.ts` fayllar naqshiga mos).
 */

/** ISO sanagacha necha to'liq kun qolgani. O'tib ketgan bo'lsa 0. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return 0;
  const target = new Date(iso).getTime();
  const diffMs = target - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Tepada ko'rsatiladigan bannerni qachon chiqarish kerakligi — sinov
 * tugashiga 3 kun qolganda yoki muddati allaqachon o'tganda. Ortiqcha
 * "hamma narsa yaxshi" bannerini har doim ko'rsatib, foydalanuvchini
 * charchatmaslik uchun chegara qo'yilgan.
 */
export function shouldShowPlanBanner(params: {
  status: "trialing" | "active" | "expired" | "canceled";
  expired: boolean;
  trialEndsAt: string | null;
  now?: Date;
}): boolean {
  if (params.expired) return true;
  if (params.status === "trialing") {
    return daysUntil(params.trialEndsAt, params.now) <= 3;
  }
  return false;
}

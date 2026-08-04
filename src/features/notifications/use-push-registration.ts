import { useEffect } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { registerPushToken } from "./notify";

/**
 * Push tokenini serverdagi holat bilan moslab turadi (P1, migration 032).
 *
 * Sessiya paydo bo'lganda yoki faol do'kon almashganda `push_tokens`ga
 * upsert qiladi. Ruxsat berilmagan bo'lsa jimgina hech narsa qilmaydi —
 * ruxsat faqat Sozlamalardagi tugma orqali so'raladi (login paytida
 * kutilmagan dialog chiqmasligi uchun).
 *
 * Token qurilma bo'yicha barqaror, shuning uchun takroriy upsert arzon
 * (`onConflict: "token"`).
 */
export function usePushRegistration(): void {
  const { session } = useAuth();
  const shopId = useActiveShopId();

  useEffect(() => {
    if (!session) return;
    // Natija bu yerda e'tiborsiz qoldiriladi — sabab jurnalga yozilgan bo'ladi,
    // fon registratsiyasi foydalanuvchiga xabar ko'rsatmaydi.
    void registerPushToken(shopId ?? null);
  }, [session, shopId]);
}

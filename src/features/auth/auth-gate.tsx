import { useEffect, type ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useAuth } from "./auth-context";
import { useRecoveryStore } from "./recovery-store";
import { useMemberships } from "./use-memberships";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";
import { OfflineBanner } from "@/components/offline-banner";
import { SyncManager } from "@/components/sync-manager";
import { logError } from "@/lib/logger";

SplashScreen.preventAutoHideAsync().catch((e) => logError("splash.prevent", e));

/**
 * Sessiya + a'zolik holatiga qarab yo'naltirish (3 guruh):
 * - sessiya yo'q → (auth)
 * - sessiya bor, a'zolik 0 ta (yangi user, do'kon hali yaratilmagan) →
 *   (onboarding). Do'konni `complete_onboarding()` RPC yaratadi — signup
 *   trigger endi shartli (ko'r. 040_onboarding.sql).
 * - sessiya bor, a'zolik bor → (tabs)
 * Parolni tiklash oqimi bundan mustasno — reset-password sessiya o'rnatadi,
 * lekin foydalanuvchi hali yangi parol kiritmagan bo'ladi (`recoveryActive`).
 *
 * A'zoliklar so'rovi (tarmoq) hal bo'lguncha ham splash ushlab turiladi —
 * aks holda "sessiya bor" deb tabs'ga o'tib, keyin darhol onboarding'ga
 * qaytarilgan holat miltillardi.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();
  const recoveryActive = useRecoveryStore((s) => s.active);
  const onboardingCompleting = useOnboardingStore((s) => s.completing);
  const { data: memberships, isSuccess: membershipsLoaded } = useMemberships();
  const segments = useSegments();
  const router = useRouter();

  const hasShop = (memberships?.length ?? 0) > 0;
  // ATAYLAB `isSuccess`, `!isLoading` EMAS: so'rov XATO bersa (internet yo'q,
  // Supabase javob bermadi) `data` undefined bo'ladi va "a'zolik yo'q" deb
  // o'qilardi — mavjud do'kon egasi onboarding'ga uloqtirilardi. Xatoda
  // hech qayerga yo'naltirmaymiz: foydalanuvchi bor joyida qoladi, offline
  // kesh (persister `memberships` prefiksini saqlaydi) ishlashda davom etadi.
  const resolving = !!session && !membershipsLoaded;

  useEffect(() => {
    if (initializing) return;
    // Splash sessiya aniqlangach yopiladi — a'zolik so'rovi xato bersa ham
    // ilova ochiq qolishi kerak (aks holda oq ekranda osilib qolardi).
    SplashScreen.hideAsync().catch((e) => logError("splash.hide", e));

    if (resolving) return;

    const group = segments[0];
    const inAuthGroup = group === "(auth)";
    const inOnboardingGroup = group === "(onboarding)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }
    if (recoveryActive) return; // parolni tiklash — reset-password o'zi yo'naltiradi
    // Do'kon yaratildi, lekin yakuniy ekran hali ko'rsatilmadi — `done.tsx`
    // dagi "Boshlash" tugmasi bayroqni tushiradi va o'zi (tabs)ga o'tkazadi.
    if (onboardingCompleting) return;

    if (!hasShop) {
      if (!inOnboardingGroup) router.replace("/(onboarding)/welcome");
      return;
    }
    if (inAuthGroup || inOnboardingGroup) {
      router.replace("/(tabs)");
    }
  }, [
    session,
    initializing,
    resolving,
    hasShop,
    segments,
    router,
    recoveryActive,
    onboardingCompleting,
  ]);

  return (
    <>
      <OfflineBanner />
      {children}
      {session ? <SyncManager /> : null}
    </>
  );
}

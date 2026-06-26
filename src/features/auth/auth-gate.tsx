import { useEffect, type ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useAuth } from "./auth-context";
import { OfflineBanner } from "@/components/offline-banner";
import { SyncManager } from "@/components/sync-manager";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Sessiyaga qarab yo'naltirish:
 * - sessiya yo'q + himoyalangan ekran → login
 * - sessiya bor + auth ekran → tabs
 * Sessiya aniqlanmaguncha native splash turadi (miltirash yo'q).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, initializing, segments, router]);

  return (
    <>
      <OfflineBanner />
      {children}
      {session ? <SyncManager /> : null}
    </>
  );
}

// `react-native-gesture-handler` BIRINCHI import bo'lib qolishi shart — u
// import qilinishi bilan native gesture tizimini o'rnatadi.
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "@/global.css";
import "@/i18n"; // i18next init (til MMKV'dan yuklanadi) — birinchi renderdan oldin
// Quyida `useColors` ham shu moduldan olinadi, lekin bu qator ATAYIN alohida:
// mavzu MMKV'dan aynan shu nuqtada, qolgan importlardan oldin tiklanadi.
// eslint-disable-next-line import/no-duplicates
import "@/theme/theme-store"; // mavzu init (rejim MMKV'dan tiklanadi) — birinchi renderdan oldin

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Toast from "react-native-toast-message";

import { queryClient } from "@/lib/query-client";
import { persistOptions } from "@/lib/offline/persister";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/features/auth/auth-context";
import { AuthGate } from "@/features/auth/auth-gate";
// eslint-disable-next-line import/no-duplicates -- yuqoridagi init importi bilan juft
import { useColors, useIsDark } from "@/theme/theme-store";
import { useToastConfig } from "@/components/ui/toast-config";

export default function RootLayout() {
  const colors = useColors();
  const isDark = useIsDark();
  const toastConfig = useToastConfig();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <ErrorBoundary onReset={() => queryClient.resetQueries()}>
              <AuthProvider>
                {/* Tungi rejimda status-bar ikonalari oq bo'lishi kerak */}
                <StatusBar style={isDark ? "light" : "dark"} />
                <AuthGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      // Ekranlar orasida o'tishda oq "flash" bo'lmasligi uchun
                      contentStyle: { backgroundColor: colors.bg },
                    }}
                  >
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="scanner" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="product-form" />
                    <Stack.Screen name="statistika" />
                    <Stack.Screen name="shift-close" />
                    <Stack.Screen name="expenses" />
                    <Stack.Screen name="nasiya" />
                    <Stack.Screen name="customer-form" />
                    <Stack.Screen name="customer-detail" />
                    <Stack.Screen name="supply" />
                    <Stack.Screen name="suppliers" />
                    <Stack.Screen name="categories" />
                    <Stack.Screen name="import-products" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="subscription" />
                    <Stack.Screen name="offline-sales" />
                    <Stack.Screen name="printer-settings" />
                    <Stack.Screen name="diagnostics" />
                    <Stack.Screen name="notifications" />
                  </Stack>
                </AuthGate>
              </AuthProvider>
            </ErrorBoundary>
            <Toast config={toastConfig} />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

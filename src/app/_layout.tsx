import "@/global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { queryClient } from "@/lib/query-client";
import { persistOptions } from "@/lib/offline/persister";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/features/auth/auth-context";
import { AuthGate } from "@/features/auth/auth-gate";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SafeAreaProvider>
        <ErrorBoundary onReset={() => queryClient.resetQueries()}>
          <AuthProvider>
            <StatusBar style="dark" />
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="scanner" options={{ presentation: "fullScreenModal" }} />
                <Stack.Screen name="product-form" />
                <Stack.Screen name="statistika" />
                <Stack.Screen name="nasiya" />
                <Stack.Screen name="customer-form" />
                <Stack.Screen name="customer-detail" />
                <Stack.Screen name="supply" />
                <Stack.Screen name="suppliers" />
                <Stack.Screen name="categories" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="offline-sales" />
                <Stack.Screen name="printer-settings" />
              </Stack>
            </AuthGate>
          </AuthProvider>
        </ErrorBoundary>
        <Toast />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

import { Stack, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Expo Router konvensiyasi — mos yo'l topilmaganda ko'rsatiladi (masalan,
 * eskirgan/xato deep link). Ilgari bu fayl umuman yo'q edi — mos yo'l
 * topilmasa foydalanuvchi bo'sh oq ekran ko'rardi.
 */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6">
        <EmptyState icon="compass-outline" text={t("app.notFoundTitle")} />
        <Text className="-mt-6 mb-6 text-center text-sm text-muted">
          {t("app.notFoundDesc")}
        </Text>
        <View className="w-full max-w-xs">
          <Button label={t("app.notFoundBtn")} onPress={() => router.replace("/(tabs)")} />
        </View>
      </SafeAreaView>
    </>
  );
}

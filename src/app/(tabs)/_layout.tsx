import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { TabBar } from "@/components/tab-bar";

export default function TabsLayout() {
  // useTranslation — til almashganda tab sarlavhalari qayta render bo'ladi
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Tartib: Bosh · Mahsulotlar · Sotuv (markaz) · Tarix · Ko'proq */}
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="katalog" options={{ title: t("nav.catalog") }} />
      <Tabs.Screen name="sotuv" options={{ title: t("nav.sell") }} />
      <Tabs.Screen name="tarix" options={{ title: t("nav.history") }} />
      <Tabs.Screen name="koproq" options={{ title: t("nav.more") }} />
    </Tabs>
  );
}

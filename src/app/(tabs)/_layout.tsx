import { Tabs } from "expo-router";

import { TabBar } from "@/components/tab-bar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Tartib: Bosh · Mahsulotlar · Sotuv (markaz) · Tarix · Ko'proq */}
      <Tabs.Screen name="index" options={{ title: "Bosh sahifa" }} />
      <Tabs.Screen name="katalog" options={{ title: "Mahsulotlar" }} />
      <Tabs.Screen name="sotuv" options={{ title: "Sotuv" }} />
      <Tabs.Screen name="tarix" options={{ title: "Tarix" }} />
      <Tabs.Screen name="koproq" options={{ title: "Ko'proq" }} />
    </Tabs>
  );
}

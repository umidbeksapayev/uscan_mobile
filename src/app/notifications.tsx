import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { EmptyState } from "@/components/ui/empty-state";
import { useAlerts } from "@/features/notifications/use-alerts";
import type { AlertKind } from "@/features/notifications/alerts-math";
import { ScreenHeader } from "@/components/ui/screen";

/**
 * Bildirishnomalar markazi.
 *
 * Ilgari bu ma'lumotlar tarqoq edi: kam qoldiq — faqat Bosh sahifada,
 * yuborilmagan sotuvlar — faqat "Ko'proq" ichida, qarzdorlar esa ilovada
 * umuman ko'rinmasdi (faqat Telegram/push orqali kelardi). Endi hammasi
 * bitta joyda va har biri tegishli ekranga olib boradi.
 */

type Meta = {
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  tone: "warning" | "danger" | "info";
  titleKey: string;
  bodyKey: string;
};

const META: Record<AlertKind, Meta> = {
  unsynced: {
    icon: "cloud-upload-outline",
    route: "/offline-sales",
    tone: "warning",
    titleKey: "alerts.unsyncedTitle",
    bodyKey: "alerts.unsyncedBody",
  },
  lowStock: {
    icon: "alert-circle-outline",
    route: "/katalog",
    tone: "danger",
    titleKey: "alerts.lowStockTitle",
    bodyKey: "alerts.lowStockBody",
  },
  debtors: {
    icon: "book-outline",
    route: "/nasiya",
    tone: "info",
    titleKey: "alerts.debtorsTitle",
    bodyKey: "alerts.debtorsBody",
  },
  lossSales: {
    icon: "trending-down-outline",
    route: "/statistika",
    tone: "danger",
    titleKey: "alerts.lossSalesTitle",
    bodyKey: "alerts.lossSalesBody",
  },
  returnsSpike: {
    icon: "return-up-back-outline",
    route: "/tarix",
    tone: "warning",
    titleKey: "alerts.returnsSpikeTitle",
    bodyKey: "alerts.returnsSpikeBody",
  },
  cashShortfall: {
    icon: "cash-outline",
    route: "/shift-close",
    tone: "danger",
    titleKey: "alerts.cashShortfallTitle",
    bodyKey: "alerts.cashShortfallBody",
  },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { alerts } = useAlerts();

  function toneColors(tone: Meta["tone"]) {
    if (tone === "danger") return { fg: colors.danger, bg: colors.dangerTint };
    if (tone === "warning") return { fg: colors.warning, bg: colors.warningTint };
    return { fg: colors.primary, bg: colors.primaryTint };
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("alerts.title", "Bildirishnomalar")} />

      {alerts.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          text={`${t("alerts.empty", "Hammasi joyida")}. ${t(
            "alerts.emptyHint",
            "E'tibor talab qiladigan narsa bo'lsa shu yerda ko'rinadi",
          )}.`}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
          {alerts.map((a) => {
            const meta = META[a.kind];
            const tone = toneColors(meta.tone);
            return (
              <Pressable
                key={a.kind}
                onPress={() => router.navigate(meta.route)}
                android_ripple={{ color: colors.line }}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
              >
                <View
                  className="items-center justify-center rounded-xl"
                  style={{ width: 40, height: 40, backgroundColor: tone.bg }}
                >
                  <Ionicons name={meta.icon} size={20} color={tone.fg} />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-medium text-ink">{t(meta.titleKey)}</Text>
                  <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
                    {t(meta.bodyKey, { count: a.count })}
                  </Text>
                </View>

                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: tone.fg }}
                >
                  <Text className="text-xs font-bold text-white">{a.count}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

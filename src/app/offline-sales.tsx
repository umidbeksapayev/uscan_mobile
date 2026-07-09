import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { loadQueue, removeSale, unsyncedCount } from "@/lib/offline/sale-queue-db";
import { retrySale } from "@/lib/offline/sync";
import { useOfflineStore } from "@/lib/offline/offline-store";
import type { QueuedSale, SaleStatus } from "@/lib/offline/sale-queue";

const STATUS: Record<SaleStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "Kutilmoqda", color: colors.warning, icon: "time-outline" },
  syncing: { label: "Yuborilmoqda", color: colors.primary, icon: "sync-outline" },
  failed: { label: "Muvaffaqiyatsiz", color: colors.danger, icon: "alert-circle-outline" },
  done: { label: "Yuborildi", color: colors.kirim, icon: "checkmark-circle-outline" },
};

export default function OfflineSalesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const shopId = useActiveShopId();
  const qc = useQueryClient();
  const setCount = useOfflineStore((s) => s.setCount);

  const { data: sales, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["offline-queue", shopId],
    enabled: !!shopId,
    queryFn: () => loadQueue(shopId!),
  });

  async function refresh() {
    qc.invalidateQueries({ queryKey: ["offline-queue"] });
    if (shopId) setCount(await unsyncedCount(shopId).catch(() => 0));
  }

  const retryMut = useMutation({
    mutationFn: (clientId: string) => retrySale(shopId!, clientId),
    onSuccess: () => {
      void refresh();
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (clientId: string) => removeSale(clientId),
    onSuccess: () => void refresh(),
  });

  function onDelete(s: QueuedSale) {
    Alert.alert(
      t("offlineSales.deleteAlertTitle", "Sotuvni o'chirish"),
      t("offlineSales.deleteAlertBody", "Navbatdagi bu sotuv o'chiriladi (yuborilmaydi)."),
      [
        { text: t("common.cancel", "Bekor"), style: "cancel" },
        { text: t("offlineSales.deleteBtn", "O'chirish"), style: "destructive", onPress: () => deleteMut.mutate(s.client_id) },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel={t("common.close", "Orqaga")}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">{t("offlineSales.screenTitle", "Yuborilmagan sotuvlar")}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (sales ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="cloud-done-outline" size={40} color={colors.kirim} />
          <Text className="text-center text-sm text-muted">
            {t("offlineSales.emptyQueue", "Hammasi yuborilgan — navbat bo'sh.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(s) => s.client_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => {
            const meta = STATUS[item.status];
            const failed = item.status === "failed";
            const statusLabel = t(`offlineSales.status_${item.status}`, meta.label);
            return (
              <View
                className="mb-2.5 rounded-2xl bg-surface p-3"
                style={{ borderWidth: 0.5, borderColor: colors.line }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: meta.color + "1A" }}
                  >
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-medium text-ink">
                      {t("offlineSales.itemSummary", "{{count}} mahsulot · {{amount}}", {
                        count: item.items.length,
                        amount: formatCurrency(item.paid_amount ?? 0),
                      })}
                    </Text>
                    <Text className="text-xs" style={{ color: meta.color }}>{statusLabel}</Text>
                  </View>
                </View>

                {failed && item.error ? (
                  <Text className="mt-2 text-xs text-danger" numberOfLines={2}>{item.error}</Text>
                ) : null}

                {failed ? (
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => retryMut.mutate(item.client_id)}
                      disabled={retryMut.isPending}
                      accessibilityLabel={t("offlineSales.retryBtn", "Qayta urinish")}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary"
                      style={{ height: 42 }}
                    >
                      <Ionicons name="refresh" size={16} color="#fff" />
                      <Text className="text-sm font-medium text-white">{t("offlineSales.retryBtn", "Qayta urinish")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(item)}
                      accessibilityLabel={t("offlineSales.deleteBtn", "O'chirish")}
                      className="items-center justify-center rounded-xl bg-bg px-4"
                      style={{ height: 42, borderWidth: 1, borderColor: colors.line }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

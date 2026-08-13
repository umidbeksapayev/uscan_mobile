import { memo, useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { ListItemCard } from "@/components/ui/list-item-card";
import { Avatar } from "@/components/ui/avatar";
import { shadowMd } from "@/theme/shadows";
import { tabularNums } from "@/theme/typography";
import { formatCurrency } from "@/lib/format";
import { useActivePermissions } from "@/features/auth/use-memberships";
import { useCustomersWithBalance } from "@/features/customers/use-customers";
import { debtTotal } from "@/features/customers/debt-math";
import type { CustomerWithBalance } from "@/types/database";
import { radius } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SkeletonList } from "@/components/ui/skeleton";

const CustomerRow = memo(function CustomerRow({
  c,
  onPress,
}: {
  c: CustomerWithBalance;
  onPress: () => void;
}) {
  const colors = useColors();

  const { t } = useTranslation();
  const owes = c.balance > 0;
  const prepaid = c.balance < 0;
  const stateColor = owes ? colors.dangerInk : prepaid ? colors.successInk : colors.muted;
  const stateLabel = owes
    ? t("customers.debtor")
    : prepaid
      ? t("customers.creditor")
      : t("customers.settled");

  return (
    <ListItemCard
      onPress={onPress}
      leading={<Avatar name={c.name} />}
      title={c.name}
      subtitle={c.phone ?? undefined}
      accessibilityLabel={`${c.name}, ${stateLabel} ${formatCurrency(Math.abs(c.balance))}`}
      trailing={
        <View className="items-end">
          <Text className="text-base font-semibold" style={{ color: stateColor, ...tabularNums }}>
            {formatCurrency(Math.abs(c.balance))}
          </Text>
          <Text className="text-xs" style={{ color: stateColor }}>
            {stateLabel}
          </Text>
        </View>
      }
    />
  );
});

export default function NasiyaScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const { canManageDebt } = useActivePermissions();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading, isError, error, refetch, isRefetching } =
    useCustomersWithBalance();

  const total = useMemo(() => debtTotal(customers ?? []), [customers]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers ?? [];
    return (customers ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
    );
  }, [customers, search]);

  /** Barqaror `renderItem` (audit A10) — `CustomerRow` memo bilan juftlashadi. */
  const renderCustomer = useCallback(
    ({ item }: { item: CustomerWithBalance }) => (
      <CustomerRow
        c={item}
        onPress={() => router.push({ pathname: "/customer-detail", params: { id: item.id } })}
      />
    ),
    [router],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("menu.debtBook")} />

      {!canManageDebt ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">{t("customers.debtGatePerm")}</Text>
        </View>
      ) : (
        <>
          <View className="px-4">
            {/* Jami qarzlar */}
            <View
              className="mb-3 rounded-2xl p-4"
              style={{ backgroundColor: colors.primaryDeep }}
            >
              <Text className="text-xs" style={{ color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 }}>
                {t("customers.allDebts").toUpperCase()}
              </Text>
              <Text
                className="mt-1 text-3xl font-bold text-white"
                style={tabularNums}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(total)}
              </Text>
            </View>

            {/* Qidiruv */}
            <View
              className="mb-3 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4"
              style={{ height: 48 }}
            >
              <Ionicons name="search" size={18} color={colors.tabInactive} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("customers.searchPlaceholder")}
                placeholderTextColor={colors.tabInactive}
                className="flex-1 text-base text-ink"
                style={{ height: 48 }}
                autoCapitalize="none"
              />
              {search ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("a11y.clearSearch", "Qidiruvni tozalash")}
                >
                  <Ionicons name="close-circle" size={18} color={colors.tabInactive} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <SkeletonList />
          ) : isError ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                {(error as Error)?.message ?? t("common.loadError")}
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="people-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                {search ? t("customers.notFound") : t("customers.emptyAddHint")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              renderItem={renderCustomer}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* FAB — yangi mijoz */}
          <PressableScale
            onPress={() => router.push("/customer-form")}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.addCustomer", "Yangi mijoz qo'shish")}
            style={{
              position: "absolute",
              right: 20,
              bottom: 24,
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              ...shadowMd(colors.shadow),
            }}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </PressableScale>
        </>
      )}
    </SafeAreaView>
  );
}

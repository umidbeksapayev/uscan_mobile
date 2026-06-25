import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useActivePermissions } from "@/features/auth/use-memberships";
import { useCustomersWithBalance } from "@/features/customers/use-customers";
import { debtTotal } from "@/features/customers/debt-math";
import type { CustomerWithBalance } from "@/types/database";

function CustomerRow({ c, onPress }: { c: CustomerWithBalance; onPress: () => void }) {
  const owes = c.balance > 0;
  const prepaid = c.balance < 0;
  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
      style={{ borderWidth: 0.5, borderColor: colors.line }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-tint">
        <Text className="text-base font-semibold text-primary">{c.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink" numberOfLines={1}>
          {c.name}
        </Text>
        {c.phone ? <Text className="text-xs text-muted">{c.phone}</Text> : null}
      </View>
      <View className="items-end">
        <Text
          className="text-base font-semibold"
          style={{ color: owes ? "#B42318" : prepaid ? "#0F6E56" : colors.muted }}
        >
          {formatCurrency(Math.abs(c.balance))}
        </Text>
        <Text className="text-xs" style={{ color: owes ? "#B42318" : prepaid ? "#0F6E56" : colors.muted }}>
          {owes ? "qarzdor" : prepaid ? "haqdor" : "qarzsiz"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NasiyaScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Nasiya daftari</Text>
      </View>

      {!canManageDebt ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">
            Nasiya daftari faqat egasi yoki "Nasiya" ruxsati bor xodimga ko'rinadi.
          </Text>
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
                JAMI QARZLAR
              </Text>
              <Text className="mt-1 text-3xl font-bold text-white" numberOfLines={1} adjustsFontSizeToFit>
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
                placeholder="Ism yoki telefon..."
                placeholderTextColor={colors.tabInactive}
                className="flex-1 text-base text-ink"
                style={{ height: 48 }}
                autoCapitalize="none"
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.tabInactive} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                {(error as Error)?.message ?? "Yuklab bo'lmadi"}
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="people-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                {search ? "Topilmadi." : "Hali mijoz yo'q. \"+\" bilan qo'shing."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <CustomerRow
                  c={item}
                  onPress={() => router.push({ pathname: "/customer-detail", params: { id: item.id } })}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* FAB — yangi mijoz */}
          <Pressable
            onPress={() => router.push("/customer-form")}
            style={{
              position: "absolute",
              right: 20,
              bottom: 24,
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0F172A",
              shadowOpacity: 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

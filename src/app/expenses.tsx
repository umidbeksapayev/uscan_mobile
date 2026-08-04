import { useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { ListItemCard } from "@/components/ui/list-item-card";
import { shadowMd } from "@/theme/shadows";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useExpenses } from "@/features/expenses/use-expenses";
import { expensesTotal, categoryLabel, type Expense } from "@/features/expenses/expense-math";
import { ExpenseFormSheet, categoryIcon } from "@/features/expenses/expense-form-sheet";

const PERIODS = [
  { days: 7, key: "periodWeek", fallback: "Hafta" },
  { days: 30, key: "periodMonth", fallback: "Oy" },
] as const;

export default function ExpensesScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const [days, setDays] = useState<7 | 30>(30);
  const { data: expenses, isLoading, isError, error, refetch, isRefetching } = useExpenses(days);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const total = expensesTotal(expenses ?? []);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(e: Expense) {
    setEditing(e);
    setFormOpen(true);
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
        <Text className="flex-1 text-xl font-semibold text-ink">{t("expenses.title", "Xarajatlar")}</Text>
        {/* Davr toggle */}
        <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.primaryTint }}>
          {PERIODS.map((p) => {
            const active = days === p.days;
            return (
              <Pressable
                key={p.days}
                onPress={() => setDays(p.days)}
                accessibilityLabel={t("expenses." + p.key, p.fallback)}
                className="rounded-full px-4 py-1.5"
                style={{ backgroundColor: active ? colors.primaryDeep : "transparent" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : colors.muted }}>
                  {t("expenses." + p.key, p.fallback)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Jami karta */}
      <View className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-line bg-surface p-4">
        <Text className="text-sm text-muted">{t("expenses.totalCard", "Jami xarajat ({{days}} kun)", { days })}</Text>
        <Text className="text-lg font-semibold" style={{ color: colors.danger }}>
          {formatCurrency(total)}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center text-sm text-danger">
            {(error as Error)?.message ?? t("common.loadError", "Xatolik yuz berdi")}
          </Text>
        </View>
      ) : (expenses?.length ?? 0) === 0 ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 10 }}>
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
            <Ionicons name="wallet-outline" size={36} color={colors.primary} />
          </View>
          <Text className="text-center text-base text-muted">
            {t("expenses.emptyPeriod", "Bu davrda xarajat yo'q. \"+\" bilan qo'shing.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <ListItemCard
              onPress={() => openEdit(item)}
              accessibilityLabel={`${categoryLabel(item.category, t)}: −${formatCurrency(item.amount)}`}
              leading={
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-tint">
                  <Ionicons name={categoryIcon(item.category)} size={20} color={colors.primary} />
                </View>
              }
              title={categoryLabel(item.category, t)}
              subtitle={`${formatDateTime(item.spent_at)}${item.note ? ` · ${item.note}` : ""}`}
              trailing={
                <Text className="text-base font-semibold" style={{ color: colors.danger }}>
                  −{formatCurrency(item.amount)}
                </Text>
              }
            />
          )}
        />
      )}

      <Pressable
        onPress={openNew}
        accessibilityLabel={t("expenses.addBtnA11y", "Xarajat qo'shish")}
        style={{ position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadowMd(colors.shadow) }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <ExpenseFormSheet visible={formOpen} expense={editing} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

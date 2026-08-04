import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Logo } from "@/components/logo";
import { useActiveMembership, useActivePermissions } from "@/features/auth/use-memberships";
import { useExpenses } from "@/features/expenses/use-expenses";
import { expensesTotal, netProfit } from "@/features/expenses/expense-math";
import {
  useSalesTrend,
  useTopProducts,
  useSlowProducts,
  useLowStockProducts,
} from "@/features/dashboard/use-dashboard";
import { trendTotals, periodSplit, pctChange } from "@/features/dashboard/dashboard-math";
import { maybeScheduleLowStockReminder } from "@/features/notifications/notify";
import { TrendChart } from "@/features/dashboard/trend-chart";
import {
  GradientStat,
  Section,
  Card,
  TopList,
  SlowList,
  LowStockList,
  ErrorBanner,
} from "@/features/dashboard/dashboard-cards";

const GRAD = {
  blue: ["#2F80ED", "#1E63C4"],
  navy: ["#1B4B82", "#0F3D6E"],
  green: ["#1FA85C", "#15803D"],
} as const;

const PERIODS = [
  { days: 1, labelKey: "dashboard.today" },
  { days: 7, labelKey: "dashboard.week" },
  { days: 30, labelKey: "dashboard.month" },
] as const;

export default function HomeScreen() {
  const colors = useColors();

  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<1 | 7 | 30>(1);
  const [refreshing, setRefreshing] = useState(false);

  const shop = useActiveMembership()?.shop;
  const { isOwner } = useActivePermissions();
  const initials = (shop?.name ?? "uS").slice(0, 2).toUpperCase();

  // 2× oyna: joriy + oldingi davr (foiz o'zgarish uchun)
  const {
    data: trend,
    isLoading: trendLoading,
    isError,
    error,
  } = useSalesTrend(period * 2);
  const { data: top, isLoading: topLoading } = useTopProducts(period, 5);
  const { data: slow } = useSlowProducts(period, 5);
  const { data: lowStock } = useLowStockProducts();
  // Xarajatlar (P5) — hook faqat egasida so'rov yuboradi (RLS ham owner-only)
  const { data: expenses } = useExpenses(period);

  // Kam qoldiq bo'lsa — ertaga 08:00 ga lokal eslatma (kuniga 1 marta, jim:
  // ruxsat faqat Sozlamalarda so'raladi; bermagan bo'lsa hech narsa qilmaydi)
  useEffect(() => {
    if (lowStock && lowStock.length > 0) {
      void maybeScheduleLowStockReminder(lowStock.length);
    }
  }, [lowStock]);

  const { current, previous } = periodSplit(trend ?? [], period);
  const cur = trendTotals(current);
  const prev = trendTotals(previous);
  const deltaSuffix = period === 1 ? t("dashboard.vsYesterday") : t("dashboard.vsPrevPeriod");
  const expTotal = expensesTotal(expenses ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["dashboard"] });
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-deep">
            <Text className="font-medium text-white">{initials}</Text>
          </View>
          <View className="flex-1">
            <Logo size={20} />
            {shop?.name ? (
              <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                {shop.name}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Davr toggle */}
        <View
          className="flex-row self-start rounded-full p-0.5"
          style={{ backgroundColor: colors.primaryTint }}
        >
          {PERIODS.map((p) => {
            const active = period === p.days;
            return (
              <Pressable
                key={p.days}
                onPress={() => setPeriod(p.days)}
                className="rounded-full px-5 py-1.5"
                style={{ backgroundColor: active ? colors.primaryDeep : "transparent" }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? "#fff" : colors.muted,
                  }}
                >
                  {t(p.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Hisobot xatosi (RPC ruxsat/tarmoq) — aks holda kartalar */}
        {isError ? (
          <ErrorBanner
            message={(error as Error)?.message ?? t("common.unknownError")}
            onRetry={() => qc.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <GradientStat
              tone={GRAD.blue}
              label={(period === 1 ? t("dashboard.todayRevenue") : t("reports.revenue")).toUpperCase()}
              value={formatNumber(cur.revenue)}
              suffix="so'm"
              icon="wallet-outline"
              delta={pctChange(cur.revenue, prev.revenue)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
            <GradientStat
              tone={GRAD.navy}
              label={t("dashboard.grossProfit").toUpperCase()}
              value={formatNumber(cur.profit)}
              suffix="so'm"
              icon="trending-up-outline"
              delta={pctChange(cur.profit, prev.profit)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
            <GradientStat
              tone={GRAD.green}
              label={t("dashboard.salesCount").toUpperCase()}
              value={`${cur.count}`}
              suffix={t("common.pcsShort")}
              icon="cart-outline"
              delta={pctChange(cur.count, prev.count)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
          </View>
        )}

        {/* Sof foyda (xarajatlardan keyin) — faqat egasi (P5) */}
        {isOwner && !isError ? (
          <Pressable onPress={() => router.push("/expenses")}>
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="wallet-outline" size={16} color={colors.danger} />
                  <Text className="text-sm text-muted">{t("menu.expenses")}</Text>
                </View>
                <Text className="text-sm font-semibold" style={{ color: colors.danger }}>
                  −{formatCurrency(expTotal)}
                </Text>
              </View>
              <View className="my-2.5 border-t border-line" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-ink">{t("dashboard.netAfterExpenses")}</Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: netProfit(cur.profit, expTotal) < 0 ? colors.danger : colors.success }}
                >
                  {formatCurrency(netProfit(cur.profit, expTotal))}
                </Text>
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Eng ko'p sotilgan */}
        <View>
          <Section title={t("dashboard.topSelling")} />
          <Card>
            <TopList items={top ?? []} loading={topLoading && !isError} />
          </Card>
        </View>

        {/* Sotuvni boshlash CTA (thumb-zone) */}
        <Pressable
          onPress={() => router.push("/sotuv")}
          className="flex-row items-center justify-center rounded-2xl bg-primary"
          style={{
            height: 56,
            gap: 8,
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 6,
          }}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text className="text-base font-semibold text-white">{t("dashboard.startSale")}</Text>
        </Pressable>

        {/* Trend grafigi (Hafta/Oy) */}
        {period !== 1 && !isError ? (
          <View>
            <Section title={t("dashboard.revenueTrend", { days: period })} />
            <Card>
              <TrendChart data={current} />
            </Card>
          </View>
        ) : null}

        {/* Kam sotilyapti */}
        {!isError ? (
          <View>
            <Section title={t("dashboard.slowMoving")} />
            <Card>
              <SlowList items={slow ?? []} />
            </Card>
          </View>
        ) : null}

        {/* Kam qoldiq */}
        <View>
          <Section title={`${t("dashboard.lowStock")}${lowStock && lowStock.length ? ` (${lowStock.length})` : ""}`} />
          <Card>
            <LowStockList items={lowStock ?? []} onTap={() => router.push("/katalog")} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

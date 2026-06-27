import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatNumber } from "@/lib/format";
import { Logo } from "@/components/logo";
import { useMemberships } from "@/features/auth/use-memberships";
import {
  useSalesTrend,
  useTopProducts,
  useSlowProducts,
  useLowStockProducts,
} from "@/features/dashboard/use-dashboard";
import { trendTotals, periodSplit, pctChange } from "@/features/dashboard/dashboard-math";
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
  { days: 1, label: "Bugun" },
  { days: 7, label: "Hafta" },
  { days: 30, label: "Oy" },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<1 | 7 | 30>(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data: memberships } = useMemberships();
  const shop = memberships?.[0]?.shop;
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

  const { current, previous } = periodSplit(trend ?? [], period);
  const cur = trendTotals(current);
  const prev = trendTotals(previous);
  const deltaSuffix = period === 1 ? "kechaga" : "oldingi davrga";

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
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Hisobot xatosi (RPC ruxsat/tarmoq) — aks holda kartalar */}
        {isError ? (
          <ErrorBanner
            message={(error as Error)?.message ?? "Noma'lum xato"}
            onRetry={() => qc.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <GradientStat
              tone={GRAD.blue}
              label={period === 1 ? "BUGUNGI SAVDO" : "TUSHUM"}
              value={formatNumber(cur.revenue)}
              suffix="so'm"
              icon="wallet-outline"
              delta={pctChange(cur.revenue, prev.revenue)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
            <GradientStat
              tone={GRAD.navy}
              label="SOF FOYDA"
              value={formatNumber(cur.profit)}
              suffix="so'm"
              icon="trending-up-outline"
              delta={pctChange(cur.profit, prev.profit)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
            <GradientStat
              tone={GRAD.green}
              label="SOTUVLAR SONI"
              value={`${cur.count}`}
              suffix="ta"
              icon="cart-outline"
              delta={pctChange(cur.count, prev.count)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
          </View>
        )}

        {/* Eng ko'p sotilgan */}
        <View>
          <Section title="Eng ko'p sotilgan" />
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
          <Text className="text-base font-semibold text-white">Sotuvni boshlash</Text>
        </Pressable>

        {/* Trend grafigi (Hafta/Oy) */}
        {period !== 1 && !isError ? (
          <View>
            <Section title={`Tushum dinamikasi (${period} kun)`} />
            <Card>
              <TrendChart data={current} />
            </Card>
          </View>
        ) : null}

        {/* Kam sotilyapti */}
        {!isError ? (
          <View>
            <Section title="Kam sotilyapti" />
            <Card>
              <SlowList items={slow ?? []} />
            </Card>
          </View>
        ) : null}

        {/* Kam qoldiq */}
        <View>
          <Section title={`Kam qoldiq${lowStock && lowStock.length ? ` (${lowStock.length})` : ""}`} />
          <Card>
            <LowStockList items={lowStock ?? []} onTap={() => router.push("/katalog")} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

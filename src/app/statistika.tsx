import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
import { pctChange } from "@/features/dashboard/dashboard-math";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { useInventoryStats, useSalesStats } from "@/features/stats/use-stats";
import { useTopProducts, useSlowProducts } from "@/features/dashboard/use-dashboard";
import { exportPeriodSales } from "@/features/stats/export-csv";
import { StatsCard } from "@/components/ui/stats-card";
import type { TopProduct } from "@/types/database";

const PERIODS = [
  { days: 1 as const, label: "Bugun", file: "bugun" },
  { days: 7 as const, label: "Hafta", file: "hafta" },
  { days: 30 as const, label: "Oy", file: "oy" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-1 text-lg font-semibold text-ink">{children}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row" style={{ gap: 10 }}>
      {children}
    </View>
  );
}

function ProductStatRow({ p, rank }: { p: TopProduct; rank?: number }) {
  const sold = p.sale_type === "weight" ? formatWeight(p.units_sold) : `${p.units_sold} dona`;
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      {rank ? <Text className="w-4 text-sm font-bold text-muted">{rank}</Text> : null}
      {p.image_url ? (
        <Image source={{ uri: p.image_url }} style={{ width: 36, height: 36, borderRadius: 10 }} contentFit="cover" />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {p.name}
        </Text>
        <Text className="text-xs text-muted">{p.units_sold <= 0 ? "Sotilmagan" : sold}</Text>
      </View>
      <Text className="text-sm font-semibold text-ink">{formatCurrency(p.revenue)}</Text>
    </View>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl bg-surface p-4"
      style={{ borderWidth: 0.5, borderColor: colors.line }}
    >
      <Text className="mb-2 text-sm font-semibold text-ink">{title}</Text>
      {children}
    </View>
  );
}

/** Savdo statistikasi — faqat view_reports'li foydalanuvchida MOUNT bo'ladi
 *  (shu sababli himoyalangan RPC'lar ruxsatsiz chaqirilmaydi). */
function SalesSection({ period, canViewCost }: { period: 1 | 7 | 30; canViewCost: boolean }) {
  const { data: s, isLoading } = useSalesStats(period);
  const { data: top, isLoading: topLoading } = useTopProducts(period, 5);
  const { data: slow, isLoading: slowLoading } = useSlowProducts(period, 5);

  return (
    <View style={{ gap: 10 }}>
      <Row>
        <StatsCard
          label="Tushum"
          value={formatCurrency(s?.revenue ?? 0)}
          icon="wallet-outline"
          tone="brand"
          delta={s ? pctChange(s.revenue, s.prev_revenue) : null}
          loading={isLoading}
        />
        <StatsCard
          label="Sof foyda"
          value={formatCurrency(s?.profit ?? 0)}
          icon="trending-up-outline"
          tone="green"
          locked={!canViewCost}
          delta={s && s.profit !== null ? pctChange(s.profit, s.prev_profit ?? 0) : null}
          loading={isLoading}
        />
      </Row>
      <Row>
        <StatsCard
          label="Sotuvlar"
          value={`${s?.sales_count ?? 0} ta`}
          icon="cart-outline"
          tone="muted"
          delta={s ? pctChange(s.sales_count, s.prev_sales_count) : null}
          loading={isLoading}
        />
        <StatsCard
          label="O'rtacha chek"
          value={formatCurrency(s?.avg_check ?? 0)}
          icon="receipt-outline"
          tone="amber"
          loading={isLoading}
        />
      </Row>

      <ListCard title="Eng ko'p sotilgan">
        {topLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (top?.length ?? 0) === 0 ? (
          <Text className="py-3 text-center text-sm text-muted">Bu davrda sotuv yo'q</Text>
        ) : (
          top!.map((p, i) => <ProductStatRow key={p.product_id} p={p} rank={i + 1} />)
        )}
      </ListCard>

      <ListCard title="Kam sotilyapti">
        {slowLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (slow?.length ?? 0) === 0 ? (
          <Text className="py-3 text-center text-sm text-muted">Ma'lumot yo'q</Text>
        ) : (
          slow!.map((p) => <ProductStatRow key={p.product_id} p={p} />)
        )}
      </ListCard>
    </View>
  );
}

function LockedSalesSection() {
  return (
    <View
      className="items-center rounded-2xl bg-surface p-6"
      style={{ borderWidth: 0.5, borderColor: colors.line, gap: 8 }}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "#EEF2F7" }}>
        <Ionicons name="lock-closed" size={24} color={colors.muted} />
      </View>
      <Text className="text-center text-sm text-muted">
        Savdo statistikasi faqat egasi yoki "Hisobotlar" ruxsati bor xodimga ko'rinadi.
      </Text>
    </View>
  );
}

export default function StatistikaScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  const { canViewReports, canViewCost } = useActivePermissions();

  const [period, setPeriod] = useState<1 | 7 | 30>(7);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: inv, isLoading: invLoading, isError: invError, error: invErr } = useInventoryStats();

  const invErrMsg = (invErr as Error)?.message ?? "";
  const migrationMissing = /could not find the function|does not exist|pgrst202/i.test(invErrMsg);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["stats"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setRefreshing(false);
  }

  async function onExport() {
    if (!shopId) return;
    const p = PERIODS.find((x) => x.days === period)!;
    setExporting(true);
    try {
      const res = await exportPeriodSales({
        shopId,
        days: period,
        includeProfit: canViewCost,
        periodLabel: p.file,
      });
      if (res === "empty") Alert.alert("Eksport", "Bu davrda sotuv yo'q.");
      else if (res === "unavailable") Alert.alert("Eksport", "Ulashish bu qurilmada mavjud emas.");
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Eksport amalga oshmadi");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Statistika</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* RPC xatosi (masalan migration 030 ishga tushirilmagan) */}
        {invError ? (
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: "#FDECEC", borderWidth: 1, borderColor: "#F7C6C6" }}
          >
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#B42318" />
              <Text className="text-base font-medium" style={{ color: "#B42318" }}>
                Statistikani yuklab bo'lmadi
              </Text>
            </View>
            <Text className="text-sm" style={{ color: "#8A2A22" }}>
              {migrationMissing
                ? "Statistika funksiyalari DB'da yo'q. Supabase'da migration 030 (030_statistics_rpcs.sql) ni ishga tushiring."
                : invErrMsg}
            </Text>
          </View>
        ) : null}

        {/* 1. Ombor qiymati */}
        <View style={{ gap: 10 }}>
          <SectionTitle>Ombor qiymati</SectionTitle>
          <Row>
            <StatsCard
              label="Mahsulot turlari"
              value={`${inv?.product_count ?? 0} ta`}
              icon="cube-outline"
              tone="brand"
              loading={invLoading}
            />
            <StatsCard
              label="Jami zaxira"
              value={`${inv?.total_unit_qty ?? 0} dona`}
              subtitle={inv && inv.total_weight_kg > 0 ? `+ ${formatWeight(inv.total_weight_kg)}` : undefined}
              icon="layers-outline"
              tone="muted"
              loading={invLoading}
            />
          </Row>
          <Row>
            <StatsCard
              label="Sotuv narxida"
              value={formatCurrency(inv?.retail_value ?? 0)}
              subtitle="hammasi sotilsa"
              icon="pricetag-outline"
              tone="green"
              loading={invLoading}
            />
            <StatsCard
              label="Tan narxida"
              value={formatCurrency(inv?.cost_value ?? 0)}
              icon="wallet-outline"
              tone="amber"
              locked={!canViewCost}
              loading={invLoading}
            />
          </Row>
          <Row>
            <StatsCard
              label="Potensial foyda"
              value={formatCurrency(inv?.potential_profit ?? 0)}
              icon="trending-up-outline"
              tone="green"
              locked={!canViewCost}
              loading={invLoading}
            />
            <StatsCard
              label="Kam qoldiq"
              value={`${inv?.low_stock_count ?? 0} ta`}
              subtitle={`Tugagan: ${inv?.out_of_stock_count ?? 0}`}
              icon="alert-circle-outline"
              tone="amber"
              loading={invLoading}
            />
          </Row>
        </View>

        {/* 2. Savdo statistikasi */}
        <View style={{ gap: 10 }}>
          <View className="flex-row items-center justify-between">
            <SectionTitle>Savdo statistikasi</SectionTitle>
            <View className="flex-row self-start rounded-full p-0.5" style={{ backgroundColor: colors.primaryTint }}>
              {PERIODS.map((p) => {
                const active = period === p.days;
                return (
                  <Pressable
                    key={p.days}
                    onPress={() => setPeriod(p.days)}
                    className="rounded-full px-3.5 py-1"
                    style={{ backgroundColor: active ? colors.primaryDeep : "transparent" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : colors.muted }}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {canViewReports ? (
            <SalesSection period={period} canViewCost={canViewCost} />
          ) : (
            <LockedSalesSection />
          )}
        </View>

        {/* 3. Eksport (CSV) — faqat view_reports */}
        {canViewReports ? (
          <Pressable
            onPress={onExport}
            disabled={exporting}
            className="mt-1 flex-row items-center justify-center rounded-2xl bg-primary"
            style={{ height: 52, gap: 8, opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text className="text-base font-semibold text-white">
                  Excel (CSV) eksport — {PERIODS.find((p) => p.days === period)!.label}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { formatCurrency, formatWeight } from "@/lib/format";
import { tabularNums } from "@/theme/typography";
import { pctChange } from "@/features/dashboard/dashboard-math";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { useInventoryStats, useSalesStats } from "@/features/stats/use-stats";
import { useCashierStats } from "@/features/stats/use-cashier-stats";
import { useTopProducts, useSlowProducts } from "@/features/dashboard/use-dashboard";
import { useStaff } from "@/features/auth/use-staff";
import { exportPeriodSales } from "@/features/stats/export-csv";
import { StatsCard } from "@/components/ui/stats-card";
import type { TopProduct } from "@/types/database";
import { radius, space, text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";
import { PressableScale } from "@/components/ui/pressable-scale";

const PERIODS = [
  { days: 1 as const, key: "today", fallback: "Bugun", file: "bugun" },
  { days: 7 as const, key: "week", fallback: "Hafta", file: "hafta" },
  { days: 30 as const, key: "month", fallback: "Oy", file: "oy" },
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
  const colors = useColors();

  const { t } = useTranslation();
  const sold = p.sale_type === "weight" ? formatWeight(p.units_sold) : `${p.units_sold} dona`;
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      {rank ? <Text className="w-4 text-sm font-bold text-muted">{rank}</Text> : null}
      {p.image_url ? (
        <Image source={{ uri: p.image_url }} style={{ width: 36, height: 36, borderRadius: radius.md }} contentFit="cover" />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {p.name}
        </Text>
        <Text className="text-xs text-muted">{p.units_sold <= 0 ? t("statistics.unsold", "Sotilmagan") : sold}</Text>
      </View>
      <Text className="text-sm font-semibold text-ink" style={tabularNums}>
        {formatCurrency(p.revenue)}
      </Text>
    </View>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();

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
  const colors = useColors();

  const { t } = useTranslation();
  const { data: s, isLoading } = useSalesStats(period);
  const { data: top, isLoading: topLoading } = useTopProducts(period, 5);
  const { data: slow, isLoading: slowLoading } = useSlowProducts(period, 5);

  return (
    <View style={{ gap: 10 }}>
      <Row>
        <StatsCard
          label={t("reports.revenue", "Tushum")}
          value={formatCurrency(s?.revenue ?? 0)}
          icon="wallet-outline"
          tone="brand"
          delta={s ? pctChange(s.revenue, s.prev_revenue) : null}
          loading={isLoading}
        />
        <StatsCard
          label={t("reports.profit", "Sof foyda")}
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
          label={t("reports.sales", "Sotuvlar")}
          value={`${s?.sales_count ?? 0} ta`}
          icon="cart-outline"
          tone="muted"
          delta={s ? pctChange(s.sales_count, s.prev_sales_count) : null}
          loading={isLoading}
        />
        <StatsCard
          label={t("statistics.avgCheck", "O'rtacha chek")}
          value={formatCurrency(s?.avg_check ?? 0)}
          icon="receipt-outline"
          tone="amber"
          loading={isLoading}
        />
      </Row>

      <ListCard title={t("statistics.topTitle", "Eng ko'p sotilgan")}>
        {topLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (top?.length ?? 0) === 0 ? (
          <Text className="py-3 text-center text-sm text-muted">{t("statistics.noSalesPeriod", "Bu davrda sotuv yo'q")}</Text>
        ) : (
          top!.map((p, i) => <ProductStatRow key={p.product_id} p={p} rank={i + 1} />)
        )}
      </ListCard>

      <ListCard title={t("statistics.slowTitle", "Kam sotilyapti")}>
        {slowLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (slow?.length ?? 0) === 0 ? (
          <Text className="py-3 text-center text-sm text-muted">{t("statistics.noData", "Ma'lumot yo'q")}</Text>
        ) : (
          slow!.map((p) => <ProductStatRow key={p.product_id} p={p} />)
        )}
      </ListCard>
    </View>
  );
}

/** Kassir bo'yicha savdo — FAQAT egaga mount bo'ladi (email'lar owner-gated
 *  list_shop_members RPC'dan; kassirlar bir-birining natijasini ko'rmaydi). */
function CashierSection({ period, shopId }: { period: 1 | 7 | 30; shopId: string }) {
  const colors = useColors();
  const router = useRouter();

  const { t } = useTranslation();
  const { data: aggs, isLoading } = useCashierStats(period);
  const { data: staff } = useStaff(shopId);

  const emailById = new Map((staff ?? []).map((m) => [m.user_id, m.email]));
  const roleById = new Map((staff ?? []).map((m) => [m.user_id, m.role]));

  return (
    <ListCard title={t("statistics.byCashier", "Kassirlar bo'yicha")}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (aggs?.length ?? 0) === 0 ? (
        <Text className="py-3 text-center text-sm text-muted">{t("statistics.noSalesPeriod", "Bu davrda sotuv yo'q")}</Text>
      ) : (
        aggs!.map((a) => {
          const email = a.cashierId ? emailById.get(a.cashierId) : null;
          const isShopOwner = a.cashierId ? roleById.get(a.cashierId) === "owner" : false;
          return (
            <View key={a.cashierId ?? "unknown"} className="flex-row items-center gap-3 py-1.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-tint">
                <Ionicons
                  name={isShopOwner ? "star-outline" : "person-outline"}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                  {email ?? t("statistics.unknownCashier", "Noma'lum (eski sotuvlar)")}
                </Text>
                <Text className="text-xs text-muted">
                  {isShopOwner ? t("statistics.ownerBadge", "Egasi · ") : ""}
                  {t("statistics.salesCountStr", "{{count}} ta sotuv", { count: a.salesCount })}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-ink" style={tabularNums}>
                {formatCurrency(a.revenue)}
              </Text>
            </View>
          );
        })
      )}

      {/* To'liq hisobot — o'rtacha chek, to'lov usullari, qaytarishlar */}
      <PressableScale
        onPress={() => router.push("/cashier-report")}
        accessibilityRole="button"
        accessibilityLabel={t("cashierReport.openBtn", "Kassir hisoboti")}
        style={{
          marginTop: space.sm,
          paddingTop: space.md,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text style={{ flex: 1, fontSize: text.sm, fontWeight: "600", color: colors.primary }}>
          {t("cashierReport.openBtn", "Kassir hisoboti")}
        </Text>
        <Ionicons name="chevron-forward" size={15} color={colors.primary} />
      </PressableScale>
    </ListCard>
  );
}

function LockedSalesSection() {
  const colors = useColors();

  const { t } = useTranslation();
  return (
    <View
      className="items-center rounded-2xl bg-surface p-6"
      style={{ borderWidth: 0.5, borderColor: colors.line, gap: 8 }}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.neutralTint }}>
        <Ionicons name="lock-closed" size={24} color={colors.muted} />
      </View>
      <Text className="text-center text-sm text-muted">
        {t("statistics.lockedHint", "Savdo statistikasi faqat egasi yoki \"Hisobotlar\" ruxsati bor xodimga ko'rinadi.")}
      </Text>
    </View>
  );
}

export default function StatistikaScreen() {
  const colors = useColors();

  const { t } = useTranslation();
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  const { canViewReports, canViewCost, isOwner } = useActivePermissions();

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
      if (res === "empty") toast.info("Eksport", t("statistics.exportEmpty", "Bu davrda sotuv yo'q."));
      else if (res === "unavailable") toast.info("Eksport", t("statistics.exportUnavailable", "Ulashish bu qurilmada mavjud emas."));
    } catch (e) {
      toast.error("Xatolik", e instanceof Error ? e.message : t("statistics.exportFailed", "Eksport amalga oshmadi"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("statistics.title", "Statistika")} />

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
            style={{ backgroundColor: colors.dangerTint, borderWidth: 1, borderColor: colors.dangerBorder }}
          >
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color={colors.dangerInk} />
              <Text className="text-base font-medium" style={{ color: colors.dangerInk }}>
                {t("statistics.loadError", "Statistikani yuklab bo'lmadi")}
              </Text>
            </View>
            <Text className="text-sm" style={{ color: colors.dangerInk }}>
              {migrationMissing
                ? t("statistics.migrationMissing", "Statistika funksiyalari DB'da yo'q. Supabase'da migration 030 (030_statistics_rpcs.sql) ni ishga tushiring.")
                : invErrMsg}
            </Text>
          </View>
        ) : null}

        {/* 1. Ombor qiymati */}
        <View style={{ gap: 10 }}>
          <SectionTitle>{t("statistics.secInventory", "Ombor qiymati")}</SectionTitle>
          <Row>
            <StatsCard
              label={t("statistics.productTypes", "Mahsulot turlari")}
              value={`${inv?.product_count ?? 0} ta`}
              icon="cube-outline"
              tone="brand"
              loading={invLoading}
            />
            <StatsCard
              label={t("statistics.totalStock", "Jami zaxira")}
              value={`${inv?.total_unit_qty ?? 0} dona`}
              subtitle={inv && inv.total_weight_kg > 0 ? `+ ${formatWeight(inv.total_weight_kg)}` : undefined}
              icon="layers-outline"
              tone="muted"
              loading={invLoading}
            />
          </Row>
          <Row>
            <StatsCard
              label={t("statistics.atRetail", "Sotuv narxida")}
              value={formatCurrency(inv?.retail_value ?? 0)}
              subtitle={t("statistics.ifAllSold", "hammasi sotilsa")}
              icon="pricetag-outline"
              tone="green"
              loading={invLoading}
            />
            <StatsCard
              label={t("statistics.atCost", "Tan narxida")}
              value={formatCurrency(inv?.cost_value ?? 0)}
              icon="wallet-outline"
              tone="amber"
              locked={!canViewCost}
              loading={invLoading}
            />
          </Row>
          <Row>
            <StatsCard
              label={t("statistics.potentialProfit", "Potensial foyda")}
              value={formatCurrency(inv?.potential_profit ?? 0)}
              icon="trending-up-outline"
              tone="green"
              locked={!canViewCost}
              loading={invLoading}
            />
            <StatsCard
              label={t("statistics.lowStockCount", "Kam qoldiq")}
              value={`${inv?.low_stock_count ?? 0} ta`}
              subtitle={t("statistics.outOfStock", "Tugagan: {{count}}", { count: inv?.out_of_stock_count ?? 0 })}
              icon="alert-circle-outline"
              tone="amber"
              loading={invLoading}
            />
          </Row>
        </View>

        {/* 2. Savdo statistikasi */}
        <View style={{ gap: 10 }}>
          <View className="flex-row items-center justify-between">
            <SectionTitle>{t("statistics.secSales", "Savdo statistikasi")}</SectionTitle>
            <View className="flex-row self-start rounded-full p-0.5" style={{ backgroundColor: colors.primaryTint }}>
              {PERIODS.map((p) => {
                const active = period === p.days;
                return (
                  <Pressable
                    key={p.days}
                    onPress={() => setPeriod(p.days)}
                    accessibilityLabel={t("statistics." + p.key, p.fallback)}
                    className="rounded-full px-3.5 py-1"
                    style={{ backgroundColor: active ? colors.primaryDeep : "transparent" }}
                  >
                    <Text style={{ fontSize: text.xs, fontWeight: "600", color: active ? "#fff" : colors.muted }}>
                      {t("statistics." + p.key, p.fallback)}
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

          {isOwner && shopId ? <CashierSection period={period} shopId={shopId} /> : null}
        </View>

        {/* 3. Eksport (CSV) — faqat view_reports */}
        {canViewReports ? (
          <Pressable
            onPress={onExport}
            disabled={exporting}
            accessibilityLabel={t("statistics.exportCsvBtn", "Excel (CSV) eksport — {{period}}", { period: t("statistics." + PERIODS.find((p) => p.days === period)!.key, PERIODS.find((p) => p.days === period)!.fallback) })}
            className="mt-1 flex-row items-center justify-center rounded-2xl bg-primary"
            style={{ height: 52, gap: 8, opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text className="text-base font-semibold text-white">
                  {t("statistics.exportCsvBtn", "Excel (CSV) eksport — {{period}}", { period: t("statistics." + PERIODS.find((p) => p.days === period)!.key, PERIODS.find((p) => p.days === period)!.fallback) })}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

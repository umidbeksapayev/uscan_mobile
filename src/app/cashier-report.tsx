import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { tabularNums } from "@/theme/typography";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/auth-context";
import { useActivePermissions } from "@/features/auth/use-memberships";
import { useCashierReport } from "@/features/stats/use-cashier-report";
import {
  paymentSplit,
  refundRate,
  reportTotals,
  type CashierReportRow,
  type PaymentKind,
} from "@/features/stats/cashier-report-math";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonList } from "@/components/ui/skeleton";

const PERIODS = [
  { days: 1 as const, key: "today", fallback: "Bugun" },
  { days: 7 as const, key: "week", fallback: "Hafta" },
  { days: 30 as const, key: "month", fallback: "Oy" },
];

/** To'lov usuli → yorliq va rang. Ranglar palitradan (tungi rejim avtomatik). */
function paymentMeta(kind: PaymentKind, colors: ReturnType<typeof useColors>) {
  switch (kind) {
    case "cash":
      return { key: "sell.payCash", fallback: "Naqd", color: colors.success };
    case "card":
      return { key: "sell.payCard", fallback: "Plastik", color: colors.primary };
    case "qr":
      return { key: "sell.payQr", fallback: "QR to'lov", color: colors.primaryLight };
    case "debt":
      return { key: "cashierReport.payDebt", fallback: "Nasiya", color: colors.warning };
  }
}

/** Bitta ko'rsatkich (yorliq + qiymat). */
function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const colors = useColors();

  return (
    <View style={{ flex: 1, minWidth: 92 }}>
      <Text style={{ fontSize: text.xs, color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={{ fontSize: text.base, fontWeight: "700", color: tone ?? colors.ink, ...tabularNums }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * To'lov usullari ulushi — bitta gorizontal chiziq.
 *
 * Doira diagramma emas: bu yerda solishtirish "qaysi usul ustun" degan
 * savolga tushadi, chiziqli ulush esa qatorlar ustma-ust turganda ham
 * o'qiladi va joy kam egallaydi.
 */
function PaymentBar({ row }: { row: CashierReportRow }) {
  const colors = useColors();
  const { t } = useTranslation();
  const slices = paymentSplit(row);

  if (slices.length === 0) return null;

  return (
    <View style={{ marginTop: space.md, gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          height: 8,
          borderRadius: radius.full,
          overflow: "hidden",
          backgroundColor: colors.neutralTint,
        }}
      >
        {slices.map((s) => {
          const meta = paymentMeta(s.kind, colors);
          return (
            <View
              key={s.kind}
              style={{ width: `${s.percent}%`, backgroundColor: meta.color }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
        {slices.map((s) => {
          const meta = paymentMeta(s.kind, colors);
          return (
            <View key={s.kind} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: meta.color,
                }}
              />
              <Text style={{ fontSize: text.xs, color: colors.muted }}>
                {t(meta.key, meta.fallback)}
              </Text>
              <Text
                style={{ fontSize: text.xs, fontWeight: "600", color: colors.ink, ...tabularNums }}
              >
                {Math.round(s.percent)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Bitta kassir kartasi. */
function CashierCard({ row, isSelf }: { row: CashierReportRow; isSelf: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();

  const isOwnerRow = row.role === "owner";
  const name = row.email ?? t("statistics.unknownCashier", "Noma'lum");
  const rate = refundRate(row);

  return (
    <Card elevated style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar name={name} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted }}>
            {t("statistics.salesCountStr", "{{count}} ta sotuv", { count: row.sales_count })}
          </Text>
        </View>
        {isSelf ? <Badge label={t("cashierReport.selfBadge", "Siz")} tone="brand" /> : null}
        {isOwnerRow && !isSelf ? (
          <Badge label={t("staff.owner", "Ega")} tone="neutral" icon="shield-checkmark" />
        ) : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.md }}>
        <Metric
          label={t("cashierReport.revenue", "Tushum")}
          value={formatCurrency(row.revenue)}
        />
        <Metric
          label={t("statistics.avgCheck", "O'rtacha chek")}
          value={formatCurrency(row.avg_check)}
        />
        {/* Foyda faqat egaga keladi (RPC `null` qaytaradi) */}
        {row.profit !== null ? (
          <Metric
            label={t("cashierReport.profit", "Foyda")}
            value={formatCurrency(row.profit)}
            tone={colors.successInk}
          />
        ) : null}
      </View>

      <PaymentBar row={row} />

      {/* Qaytarish — nazorat ko'rsatkichi, faqat egada */}
      {row.returns_count !== null && row.returns_count > 0 ? (
        <View
          style={{
            marginTop: space.md,
            paddingTop: space.md,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
          }}
        >
          <Ionicons name="return-down-back-outline" size={15} color={colors.dangerInk} />
          <Text style={{ flex: 1, fontSize: text.xs, color: colors.muted }}>
            {t("cashierReport.returnsLabel", "Qaytarish")} · {row.returns_count}
          </Text>
          <Text
            style={{ fontSize: text.xs, fontWeight: "600", color: colors.dangerInk, ...tabularNums }}
          >
            {formatCurrency(row.refund_total ?? 0)} ({rate.toFixed(1)}%)
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function CashierReportScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { session } = useAuth();
  const { isOwner } = useActivePermissions();

  const [period, setPeriod] = useState<1 | 7 | 30>(30);
  const [refreshing, setRefreshing] = useState(false);
  const { data: rows, isLoading, isError, error } = useCashierReport(period);

  const errMsg = (error as Error)?.message ?? "";
  const migrationMissing = /could not find the function|does not exist|pgrst202/i.test(errMsg);
  const totals = reportTotals(rows ?? []);

  async function onRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["stats", "cashier-report"] });
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader
        title={t("cashierReport.title", "Kassir hisoboti")}
        right={
          <View
            className="flex-row rounded-full p-0.5"
            style={{ backgroundColor: colors.primaryTint }}
          >
            {PERIODS.map((p) => {
              const active = period === p.days;
              return (
                <Pressable
                  key={p.days}
                  onPress={() => setPeriod(p.days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t("statistics." + p.key, p.fallback)}
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: active ? colors.primaryDeep : "transparent" }}
                >
                  <Text
                    style={{
                      fontSize: text.xs,
                      fontWeight: "600",
                      color: active ? "#fff" : colors.muted,
                    }}
                  >
                    {t("statistics." + p.key, p.fallback)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={{ fontSize: text.xs, color: colors.muted, marginBottom: space.md }}>
          {isOwner
            ? t("cashierReport.subtitleOwner", "Har bir kassirning davr natijasi")
            : t("cashierReport.ownOnlyHint", "Siz faqat o'z natijangizni ko'rasiz.")}
        </Text>

        {isLoading ? (
          <SkeletonList count={3} />
        ) : isError ? (
          <Card tone="danger">
            <Text style={{ fontSize: text.sm, color: colors.dangerInk }}>
              {migrationMissing
                ? t(
                    "statistics.migrationMissing",
                    "Hisobot funksiyasi DB'da yo'q. Supabase'da migration 033 ni ishga tushiring.",
                  )
                : errMsg}
            </Text>
          </Card>
        ) : (rows?.length ?? 0) === 0 ? (
          <Card style={{ alignItems: "center", gap: space.sm, paddingVertical: 32 }}>
            <Ionicons name="receipt-outline" size={32} color={colors.muted} />
            <Text style={{ fontSize: text.sm, color: colors.muted, textAlign: "center" }}>
              {t("cashierReport.empty", "Bu davrda sotuv yo'q")}
            </Text>
          </Card>
        ) : (
          <>
            {/* Jami — bir nechta kassir bo'lgandagina ma'noli */}
            {(rows?.length ?? 0) > 1 ? (
              <Card tone="brand" style={{ marginBottom: space.md }}>
                <Text
                  style={{
                    fontSize: text.xs,
                    fontWeight: "700",
                    color: colors.primary,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: space.sm,
                  }}
                >
                  {t("cashierReport.totalRow", "Jami")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
                  <Metric
                    label={t("cashierReport.revenue", "Tushum")}
                    value={formatCurrency(totals.revenue)}
                  />
                  <Metric
                    label={t("statistics.avgCheck", "O'rtacha chek")}
                    value={formatCurrency(totals.avgCheck)}
                  />
                  {totals.profit !== null ? (
                    <Metric
                      label={t("cashierReport.profit", "Foyda")}
                      value={formatCurrency(totals.profit)}
                      tone={colors.successInk}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            {rows!.map((r) => (
              <CashierCard
                key={r.cashier_id ?? "unknown"}
                row={r}
                isSelf={!!r.cashier_id && r.cashier_id === session?.user.id}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
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
import type { Product, TopProduct } from "@/types/database";

const GRAD = {
  blue: ["#2F80ED", "#1E63C4"],
  navy: ["#1B4B82", "#0F3D6E"],
  green: ["#1FA85C", "#15803D"],
} as const;

/** 2450000 → "2 450 000" */
function groupSom(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function DeltaPill({ delta, suffix }: { delta: number; suffix: string }) {
  const up = delta >= 0;
  return (
    <View
      className="flex-row items-center self-start rounded-full px-2 py-1"
      style={{ gap: 3, backgroundColor: "rgba(255,255,255,0.18)" }}
    >
      <Ionicons name={up ? "arrow-up" : "arrow-down"} size={11} color={up ? "#BBF7D0" : "#FECACA"} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>
        {`${up ? "+" : ""}${delta.toFixed(0)}% ${suffix}`}
      </Text>
    </View>
  );
}

function GradientStat({
  tone,
  label,
  value,
  suffix,
  icon,
  delta,
  deltaSuffix,
  loading,
}: {
  tone: readonly [string, string];
  label: string;
  value: string;
  suffix: string;
  icon: keyof typeof Ionicons.glyphMap;
  delta: number | null;
  deltaSuffix: string;
  loading?: boolean;
}) {
  return (
    <LinearGradient
      colors={tone}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 22,
        padding: 18,
        shadowColor: tone[1],
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      }}
    >
      <View className="flex-row items-start justify-between">
        {delta !== null ? <DeltaPill delta={delta} suffix={deltaSuffix} /> : <View />}
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
        >
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
      </View>
      <Text
        className="mt-3"
        style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, color: "rgba(255,255,255,0.8)" }}
      >
        {label}
      </Text>
      {loading ? (
        <View className="mt-2 h-8 rounded-md" style={{ width: "60%", backgroundColor: "rgba(255,255,255,0.25)" }} />
      ) : (
        <Text className="mt-1" numberOfLines={1} adjustsFontSizeToFit>
          <Text style={{ fontSize: 30, fontWeight: "800", color: "#fff" }}>{value}</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>
            {" "}
            {suffix}
          </Text>
        </Text>
      )}
    </LinearGradient>
  );
}

function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      {action}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl bg-surface p-4"
      style={{
        borderWidth: 0.5,
        borderColor: colors.line,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function Thumb({ uri }: { uri: string | null }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: 40, height: 40, borderRadius: 12 }} contentFit="cover" />
  ) : (
    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
      <Ionicons name="cube-outline" size={18} color={colors.primary} />
    </View>
  );
}

function soldLabel(p: TopProduct): string {
  return p.sale_type === "weight" ? formatWeight(p.units_sold) : `${p.units_sold} dona`;
}

function EmptyRow({ text }: { text: string }) {
  return <Text className="py-4 text-center text-sm text-muted">{text}</Text>;
}

function TopList({ items, loading }: { items: TopProduct[]; loading?: boolean }) {
  if (loading) return <EmptyRow text="Yuklanmoqda…" />;
  if (items.length === 0) return <EmptyRow text="Bu davrda sotuv yo'q" />;
  const max = Math.max(...items.map((p) => p.revenue), 1);
  return (
    <View style={{ gap: 12 }}>
      {items.map((p, i) => (
        <View key={p.product_id} className="flex-row items-center gap-3">
          <Text className="w-4 text-sm font-bold text-muted">{i + 1}</Text>
          <Thumb uri={p.image_url} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-medium text-ink" numberOfLines={1}>
              {p.name}
            </Text>
            <View
              className="mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.line }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${(p.revenue / max) * 100}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-ink">{formatCurrency(p.revenue)}</Text>
            <Text className="text-xs text-muted">{soldLabel(p)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SlowList({ items }: { items: TopProduct[] }) {
  if (items.length === 0) return <EmptyRow text="Ma'lumot yo'q" />;
  return (
    <View style={{ gap: 12 }}>
      {items.map((p) => {
        const unsold = p.units_sold <= 0;
        return (
          <View key={p.product_id} className="flex-row items-center gap-3">
            <Thumb uri={p.image_url} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-xs text-muted">
                {unsold ? "Sotilmagan" : formatCurrency(p.revenue)}
              </Text>
            </View>
            {unsold ? (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#FCF1DD" }}>
                <Text style={{ fontSize: 11, fontWeight: "500", color: "#92600A" }}>Sotilmagan</Text>
              </View>
            ) : (
              <View className="items-end">
                <Text className="text-sm font-semibold text-ink">{soldLabel(p)}</Text>
                <Text className="text-xs text-muted">sotildi</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function LowStockList({ items, onTap }: { items: Product[]; onTap: () => void }) {
  if (items.length === 0)
    return (
      <View className="items-center py-4" style={{ gap: 6 }}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <Text className="text-sm text-muted">Barcha mahsulot yetarli</Text>
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      {items.slice(0, 6).map((p) => {
        const out = p.quantity <= 0;
        const qty = p.sale_type === "weight" ? formatWeight(p.quantity) : `${p.quantity} dona`;
        return (
          <Pressable
            key={p.id}
            onPress={onTap}
            className="flex-row items-center gap-3 rounded-xl p-2"
            style={{ borderWidth: 1, borderColor: colors.line }}
          >
            <Thumb uri={p.image_url} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-medium text-ink" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-xs text-muted">Qoldiq: {qty}</Text>
            </View>
            <View
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ gap: 3, backgroundColor: "#FDECEC" }}
            >
              <Ionicons name="alert-circle-outline" size={12} color="#B42318" />
              <Text style={{ fontSize: 11, fontWeight: "500", color: "#B42318" }}>
                {out ? "Tugagan" : "Kam"}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  // Ruxsat xatosini foydalanuvchiga tushunarli qilamiz
  const friendly = /ruxsat|permission|denied/i.test(message)
    ? "Hisobotlarni ko'rish ruxsati yo'q. Egasi sifatida kiring yoki kassirga \"Hisobotlar\" ruxsatini bering."
    : message;
  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: "#FDECEC", borderWidth: 1, borderColor: "#F7C6C6" }}
    >
      <View className="mb-1 flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={18} color="#B42318" />
        <Text className="text-base font-medium" style={{ color: "#B42318" }}>
          Hisobotlarni yuklab bo'lmadi
        </Text>
      </View>
      <Text className="mb-3 text-sm" style={{ color: "#8A2A22" }}>
        {friendly}
      </Text>
      <Pressable
        onPress={onRetry}
        className="flex-row items-center self-start rounded-xl px-4 py-2"
        style={{ gap: 6, backgroundColor: "#B42318" }}
      >
        <Ionicons name="refresh" size={15} color="#fff" />
        <Text className="text-sm font-medium text-white">Qayta urinish</Text>
      </Pressable>
    </View>
  );
}

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
              value={groupSom(cur.revenue)}
              suffix="so'm"
              icon="wallet-outline"
              delta={pctChange(cur.revenue, prev.revenue)}
              deltaSuffix={deltaSuffix}
              loading={trendLoading}
            />
            <GradientStat
              tone={GRAD.navy}
              label="SOF FOYDA"
              value={groupSom(cur.profit)}
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

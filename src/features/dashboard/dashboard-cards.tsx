import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { shadowSm, shadowGlow } from "@/theme/shadows";
import { formatCurrency, formatWeight } from "@/lib/format";
import type { Product, TopProduct } from "@/types/database";

function DeltaPill({ delta, suffix }: { delta: number; suffix: string }) {
  const up = delta >= 0;
  return (
    <View
      className="flex-row items-center self-start rounded-full px-2 py-1"
      style={{ gap: 3, backgroundColor: "rgba(255,255,255,0.18)" }}
    >
      {/* Brend rangli karta ustida turadi — foni ikkala rejimda bir xil,
          shuning uchun ikonka rangi ham mavzuga bog'lanmaydi. */}
      <Ionicons name={up ? "arrow-up" : "arrow-down"} size={11} color={up ? "#BBF7D0" : "#FECACA"} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>
        {`${up ? "+" : ""}${delta.toFixed(0)}% ${suffix}`}
      </Text>
    </View>
  );
}

export function GradientStat({
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
        ...shadowGlow(tone[1]),
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

export function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      {action}
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();

  return (
    <View
      className="rounded-2xl bg-surface p-4"
      style={{
        borderWidth: 0.5,
        borderColor: colors.line,
        ...shadowSm(colors.shadow),
      }}
    >
      {children}
    </View>
  );
}

function Thumb({ uri }: { uri: string | null }) {
  const colors = useColors();

  return uri ? (
    <Image source={{ uri }} style={{ width: 40, height: 40, borderRadius: 12 }} contentFit="cover" />
  ) : (
    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
      <Ionicons name="cube-outline" size={18} color={colors.primary} />
    </View>
  );
}

function soldLabel(p: TopProduct, pcs: string): string {
  return p.sale_type === "weight" ? formatWeight(p.units_sold) : `${p.units_sold} ${pcs}`;
}

function EmptyRow({ text }: { text: string }) {
  return <Text className="py-4 text-center text-sm text-muted">{text}</Text>;
}

export function TopList({ items, loading }: { items: TopProduct[]; loading?: boolean }) {
  const colors = useColors();

  const { t } = useTranslation();
  if (loading) return <EmptyRow text={t("common.loading")} />;
  if (items.length === 0) return <EmptyRow text={t("reports.noSales")} />;
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
            <Text className="text-xs text-muted">{soldLabel(p, t("common.pcs"))}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function SlowList({ items }: { items: TopProduct[] }) {
  const colors = useColors();

  const { t } = useTranslation();
  if (items.length === 0) return <EmptyRow text={t("common.noData")} />;
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
                {unsold ? t("dashboard.notSold") : formatCurrency(p.revenue)}
              </Text>
            </View>
            {unsold ? (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.warningTint }}>
                <Text style={{ fontSize: 11, fontWeight: "500", color: colors.warningInk }}>
                  {t("dashboard.notSold")}
                </Text>
              </View>
            ) : (
              <View className="items-end">
                <Text className="text-sm font-semibold text-ink">{soldLabel(p, t("common.pcs"))}</Text>
                <Text className="text-xs text-muted">{t("dashboard.sold").toLowerCase()}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function LowStockList({ items, onTap }: { items: Product[]; onTap: () => void }) {
  const colors = useColors();

  const { t } = useTranslation();
  if (items.length === 0)
    return (
      <View className="items-center py-4" style={{ gap: 6 }}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <Text className="text-sm text-muted">{t("dashboard.allStocked")}</Text>
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      {items.slice(0, 6).map((p) => {
        const out = p.quantity <= 0;
        const qty =
          p.sale_type === "weight" ? formatWeight(p.quantity) : `${p.quantity} ${t("common.pcs")}`;
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
              <Text className="text-xs text-muted">
                {t("dashboard.remaining")}: {qty}
              </Text>
            </View>
            <View
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ gap: 3, backgroundColor: colors.dangerTint }}
            >
              <Ionicons name="alert-circle-outline" size={12} color={colors.dangerInk} />
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.dangerInk }}>
                {out ? t("dashboard.out") : t("dashboard.low")}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();

  const { t } = useTranslation();
  // Ruxsat xatosini foydalanuvchiga tushunarli qilamiz
  const friendly = /ruxsat|permission|denied/i.test(message) ? t("dashboard.permHint") : message;
  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: colors.dangerTint, borderWidth: 1, borderColor: colors.dangerBorder }}
    >
      <View className="mb-1 flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={18} color={colors.dangerInk} />
        <Text className="text-base font-medium" style={{ color: colors.dangerInk }}>
          {t("dashboard.loadFailed")}
        </Text>
      </View>
      <Text className="mb-3 text-sm" style={{ color: colors.dangerInk }}>
        {friendly}
      </Text>
      <Pressable
        onPress={onRetry}
        className="flex-row items-center self-start rounded-xl px-4 py-2"
        style={{ gap: 6, backgroundColor: colors.dangerInk }}
      >
        <Ionicons name="refresh" size={15} color="#fff" />
        <Text className="text-sm font-medium text-white">{t("sync.retry")}</Text>
      </Pressable>
    </View>
  );
}

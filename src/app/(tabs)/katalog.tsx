import { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { shadowSm, shadowMd } from "@/theme/shadows";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatWeight } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useProducts, type CategoryFilter } from "@/features/catalog/use-products";
import { useCategories } from "@/features/catalog/use-categories";
import { useMemberships, useActivePermissions, useActiveShopId } from "@/features/auth/use-memberships";
import { useLabelPrint } from "@/features/labels/use-print-label";
import { exportProductsCsv } from "@/features/products/export-products";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/database";
import { radius, text } from "@/theme/tokens";

function StockBadge({ item }: { item: Product }) {
  const colors = useColors();

  const { t } = useTranslation();
  const isWeight = item.sale_type === "weight";
  const q = item.quantity;

  let tone: "ok" | "low" | "crit" | "out";
  if (q <= 0) tone = "out";
  else if (q <= item.low_stock_alert) tone = "crit";
  else if (q <= item.low_stock_alert * 2) tone = "low";
  else tone = "ok";

  const palette = {
    ok: { dot: colors.success, bg: colors.successTint, text: colors.successInk },
    low: { dot: colors.warning, bg: colors.warningTint, text: colors.warningInk },
    crit: { dot: colors.danger, bg: colors.dangerTint, text: colors.dangerInk },
    out: { dot: colors.danger, bg: colors.dangerTint, text: colors.dangerInk },
  }[tone];

  const label =
    tone === "out" ? t("catalog.statusOut") : isWeight ? formatWeight(q) : `${q} ${t("common.pcs")}`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: palette.bg,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.full,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: palette.dot }} />
      <Text style={{ fontSize: text.xs, fontWeight: "500", color: palette.text }}>{label}</Text>
    </View>
  );
}

/**
 * Katalog qatori. `memo` (audit A10): katalogda yuzlab mahsulot bo'lishi
 * mumkin va qidiruv har bosilganda ekranni qayta render qiladi — memo'siz
 * har harfda butun ro'yxat qayta chiziladi.
 */
const ProductRow = memo(function ProductRow({
  item,
  selectionMode,
  selected,
}: {
  item: Product;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const colors = useColors();

  return (
    <View
      className="mb-3 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
      style={{
        borderWidth: selected ? 1.5 : 0.5,
        borderColor: selected ? colors.primary : colors.line,
        ...shadowSm(colors.shadow),
      }}
    >
      {selectionMode ? (
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={selected ? colors.primary : colors.tabInactive}
        />
      ) : null}
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: 56, height: 56, borderRadius: radius.lg }}
          contentFit="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint">
          <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>
      )}

      <View className="flex-1">
        <Text className="text-lg font-medium text-ink" numberOfLines={2}>
          {item.name}
        </Text>
        {item.category?.name ? (
          <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
            {item.category.name}
          </Text>
        ) : null}
      </View>

      <View className="items-end" style={{ gap: 6 }}>
        <Text className="text-base font-medium text-heading">
          {formatCurrency(item.selling_price)}
        </Text>
        <StockBadge item={item} />
      </View>
    </View>
  );
});

export default function KatalogScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<CategoryFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounce(search, 300);

  // Yorliq (label) tanlash rejimi
  const [labelMode, setLabelMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState(1);
  const { print: printLabels, printing } = useLabelPrint();

  const { data: products, isLoading, isError, refetch, isRefetching } = useProducts({
    search: debounced,
    categoryId: cat,
  });
  const { data: categories } = useCategories();
  // Faol do'kon yuklanmaguncha so'rovlar o'chiq — bo'sh-holat chaqnashini oldini olamiz
  const { isLoading: membershipsLoading } = useMemberships();
  const { canManageProducts, canViewCost } = useActivePermissions();
  const shopId = useActiveShopId();
  const [exporting, setExporting] = useState(false);

  const chips: { id: CategoryFilter; name: string }[] = [
    { id: "all", name: t("common.all") },
    ...(categories ?? []).map((c) => ({ id: c.id as CategoryFilter, name: c.name })),
  ];

  const filterActive = showFilters || cat !== "all";

  function onScan() {
    toast.info(t("barcode.scanBtn"), t("catalog.scanInSell"));
  }
  function onAdd() {
    router.push("/product-form");
  }
  const onRowPress = useCallback(
    (item: Product) => {
      if (!canManageProducts) {
        toast.info(t("common.noPermission"), t("catalog.editPermHint"));
        return;
      }
      router.push({ pathname: "/product-form", params: { id: item.id } });
    },
    [canManageProducts, router, t],
  );

  function toggleLabelMode() {
    setLabelMode((v) => !v);
    setSelected(new Set());
    setCopies(1);
  }
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /**
   * Barqaror `renderItem` (audit A10) — inline arrow har renderda yangi
   * funksiya yaratib, `FlatList`ni butun ro'yxatni qayta chizishga majburlardi.
   * `selected` — Set, ya'ni tanlov o'zgarganda bu funksiya ham yangilanadi;
   * lekin `ProductRow` memo bo'lgani uchun faqat holati o'zgargan qatorlar
   * qayta chiziladi.
   */
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <Pressable onPress={() => (labelMode ? toggleSelect(item.id) : onRowPress(item))}>
        <ProductRow item={item} selectionMode={labelMode} selected={selected.has(item.id)} />
      </Pressable>
    ),
    [labelMode, selected, toggleSelect, onRowPress],
  );
  async function onPrintSelected() {
    const chosen = (products ?? []).filter((p) => selected.has(p.id));
    const ok = await printLabels(chosen, copies);
    if (ok) toggleLabelMode();
  }

  /** Katalogni CSV qilib ulashish — tan narx faqat view_cost bo'lsa (S1). */
  async function onExport() {
    if (!shopId || exporting) return;
    setExporting(true);
    try {
      const res = await exportProductsCsv({ shopId, includeCost: canViewCost });
      if (res === "empty") toast.info(t("catalog.export"), t("settings.exportEmpty"));
      if (res === "unavailable") toast.error(t("catalog.export"), t("catalog.shareUnavailable"));
    } catch (e) {
      toast.error(t("settings.exportError"), e instanceof Error ? e.message : t("common.unknownError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-medium text-heading">
            {labelMode ? t("labels.selectedCount", { count: selected.size }) : t("catalog.title")}
          </Text>
          <View className="flex-row items-center gap-5">
            {!labelMode && canManageProducts ? (
              <Pressable
                onPress={onExport}
                hitSlop={10}
                disabled={exporting}
                accessibilityLabel={t("catalog.exportCsv")}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={24} color={colors.primary} />
                )}
              </Pressable>
            ) : null}
            <Pressable
              onPress={toggleLabelMode}
              hitSlop={10}
              accessibilityLabel={labelMode ? t("common.close") : t("labels.bulkBtn")}
            >
              <Ionicons
                name={labelMode ? "close" : "pricetags-outline"}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {/* Qidiruv + skaner + filter */}
        <View className="mb-3 flex-row items-center gap-2">
          <View
            className="flex-1 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4"
            style={{ height: 48 }}
          >
            <Ionicons name="search" size={18} color={colors.tabInactive} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("catalog.searchPlaceholder")}
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
            ) : (
              <Pressable
                onPress={onScan}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.scan", "Shtrix-kodni skanerlash")}
              >
                <Ionicons name="barcode-outline" size={22} color={colors.primary} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.filters", "Filtrlar")}
            accessibilityState={{ expanded: showFilters }}
            style={{
              height: 48,
              width: 48,
              borderRadius: radius.lg,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: filterActive ? colors.primary : colors.primaryTint,
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={filterActive ? "#fff" : colors.primary}
            />
          </Pressable>
        </View>

        {/* Kategoriya chiplari (filter tugmasi bilan ochiladi) */}
        {showFilters ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          >
            {chips.map((c) => {
              const active = cat === c.id;
              return (
                <Pressable
                  key={String(c.id)}
                  onPress={() => setCat(c.id)}
                  style={{
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.line,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: radius.full,
                  }}
                >
                  <Text
                    style={{
                      fontSize: text.sm,
                      fontWeight: "500",
                      color: active ? "#fff" : colors.muted,
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* Ro'yxat */}
      {isLoading || membershipsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState icon="cloud-offline-outline" text={t("common.loadError")} />
      ) : (products?.length ?? 0) === 0 ? (
        <EmptyState
          icon="cube-outline"
          text={debounced ? t("catalog.notFound") : t("catalog.empty")}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={renderProduct}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: labelMode ? 160 : 90,
          }}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Yorliq chop etish paneli (tanlash rejimi) */}
      {labelMode && selected.size > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: 16, gap: 10 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">{t("labels.copiesEach")}</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setCopies((c) => Math.max(1, c - 1))}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.decrease", "Kamaytirish")}
                className="h-9 w-9 items-center justify-center rounded-xl bg-bg"
              >
                <Ionicons name="remove" size={18} color={colors.ink} />
              </Pressable>
              <Text
                className="text-base font-medium text-ink"
                style={{ minWidth: 24, textAlign: "center" }}
              >
                {copies}
              </Text>
              <Pressable
                onPress={() => setCopies((c) => Math.min(50, c + 1))}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.increase", "Ko'paytirish")}
                className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint"
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          <Button
            label={`${t("labels.bulkTitle")} (${selected.size})`}
            onPress={onPrintSelected}
            loading={printing}
          />
        </View>
      ) : null}

      {/* Mahsulot qo'shish (FAB) — yorliq rejimida yashiriladi, faqat ruxsati bor foydalanuvchiga */}
      {!labelMode && canManageProducts ? (
        <Pressable
          onPress={onAdd}
          accessibilityLabel={t("catalog.newProduct")}
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            width: 56,
            height: 56,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            ...shadowMd(colors.shadow),
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

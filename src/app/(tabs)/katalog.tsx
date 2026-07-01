import { useState } from "react";
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

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useProducts, type CategoryFilter } from "@/features/catalog/use-products";
import { useCategories } from "@/features/catalog/use-categories";
import { useMemberships, useActivePermissions } from "@/features/auth/use-memberships";
import { useLabelPrint } from "@/features/labels/use-print-label";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/database";

function StockBadge({ item }: { item: Product }) {
  const isWeight = item.sale_type === "weight";
  const q = item.quantity;

  let tone: "ok" | "low" | "crit" | "out";
  if (q <= 0) tone = "out";
  else if (q <= item.low_stock_alert) tone = "crit";
  else if (q <= item.low_stock_alert * 2) tone = "low";
  else tone = "ok";

  const palette = {
    ok: { dot: colors.success, bg: "#E7F6EE", text: "#0F6E56" },
    low: { dot: colors.warning, bg: "#FCF1DD", text: "#92600A" },
    crit: { dot: colors.danger, bg: "#FDECEC", text: "#B42318" },
    out: { dot: colors.danger, bg: "#FDECEC", text: "#B42318" },
  }[tone];

  const label = tone === "out" ? "Tugagan" : isWeight ? formatWeight(q) : `${q} dona`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: palette.bg,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.dot }} />
      <Text style={{ fontSize: 12, fontWeight: "500", color: palette.text }}>{label}</Text>
    </View>
  );
}

function ProductRow({
  item,
  selectionMode,
  selected,
}: {
  item: Product;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  return (
    <View
      className="mb-3 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
      style={{
        borderWidth: selected ? 1.5 : 0.5,
        borderColor: selected ? colors.primary : colors.line,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
          style={{ width: 56, height: 56, borderRadius: 14 }}
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
        <Text className="text-base font-medium text-primary-deep">
          {formatCurrency(item.selling_price)}
        </Text>
        <StockBadge item={item} />
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text className="text-center text-base text-muted">{text}</Text>
    </View>
  );
}

export default function KatalogScreen() {
  const router = useRouter();
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
  const { canManageProducts } = useActivePermissions();

  const chips: { id: CategoryFilter; name: string }[] = [
    { id: "all", name: "Barchasi" },
    ...(categories ?? []).map((c) => ({ id: c.id as CategoryFilter, name: c.name })),
  ];

  const filterActive = showFilters || cat !== "all";

  function onScan() {
    toast.info("Skaner", "Barcode skaner F3 (Sotuv) bosqichida qo'shiladi.");
  }
  function onAdd() {
    router.push("/product-form");
  }
  function onRowPress(item: Product) {
    if (!canManageProducts) {
      toast.info("Ruxsat yo'q", "Mahsulotlarni tahrirlash uchun ruxsat kerak.");
      return;
    }
    router.push({ pathname: "/product-form", params: { id: item.id } });
  }

  function toggleLabelMode() {
    setLabelMode((v) => !v);
    setSelected(new Set());
    setCopies(1);
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function onPrintSelected() {
    const chosen = (products ?? []).filter((p) => selected.has(p.id));
    const ok = await printLabels(chosen, copies);
    if (ok) toggleLabelMode();
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-medium text-primary-deep">
            {labelMode ? `Yorliq: ${selected.size} ta` : "Mahsulotlar"}
          </Text>
          <Pressable onPress={toggleLabelMode} hitSlop={10}>
            <Ionicons
              name={labelMode ? "close" : "pricetags-outline"}
              size={24}
              color={colors.primary}
            />
          </Pressable>
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
              placeholder="Mahsulotlarni qidirish..."
              placeholderTextColor={colors.tabInactive}
              className="flex-1 text-base text-ink"
              style={{ height: 48 }}
              autoCapitalize="none"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.tabInactive} />
              </Pressable>
            ) : (
              <Pressable onPress={onScan} hitSlop={8}>
                <Ionicons name="barcode-outline" size={22} color={colors.primary} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={{
              height: 48,
              width: 48,
              borderRadius: 16,
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
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
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
        <EmptyState
          icon="cloud-offline-outline"
          text="Ma'lumotni yuklab bo'lmadi. Internet yoki .env ni tekshiring."
        />
      ) : (products?.length ?? 0) === 0 ? (
        <EmptyState
          icon="cube-outline"
          text={debounced ? "Hech narsa topilmadi." : "Hali mahsulot qo'shilmagan."}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => (labelMode ? toggleSelect(item.id) : onRowPress(item))}
            >
              <ProductRow item={item} selectionMode={labelMode} selected={selected.has(item.id)} />
            </Pressable>
          )}
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
            <Text className="text-sm text-muted">Har biri uchun nusxa</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setCopies((c) => Math.max(1, c - 1))}
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
                className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint"
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          <Button
            label={`Yorliq chop etish (${selected.size})`}
            onPress={onPrintSelected}
            loading={printing}
          />
        </View>
      ) : null}

      {/* Mahsulot qo'shish (FAB) — yorliq rejimida yashiriladi, faqat ruxsati bor foydalanuvchiga */}
      {!labelMode && canManageProducts ? (
        <Pressable
          onPress={onAdd}
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
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
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

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
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useProducts, type CategoryFilter } from "@/features/catalog/use-products";
import { useCategories } from "@/features/catalog/use-categories";
import type { Product } from "@/types/database";

function ProductRow({ item }: { item: Product }) {
  const isWeight = item.sale_type === "weight";
  const qtyText = isWeight ? formatWeight(item.quantity) : `${item.quantity} dona`;
  const stock =
    item.quantity <= 0 ? "out" : item.quantity <= item.low_stock_alert ? "low" : "ok";

  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: 48, height: 48, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
        </View>
      )}

      <View className="flex-1">
        <Text className="text-base font-medium text-ink" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View
            style={{
              backgroundColor: isWeight ? "#E1F5EE" : colors.primaryTint,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text
              style={{ fontSize: 11, fontWeight: "500", color: isWeight ? "#0F6E56" : "#185FA5" }}
            >
              {isWeight ? "Kg" : "Dona"}
            </Text>
          </View>
          {item.category?.name ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {item.category.name}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="items-end">
        <Text className="text-base font-medium text-primary-deep">
          {formatCurrency(item.selling_price)}
        </Text>
        <Text
          style={{
            fontSize: 12,
            marginTop: 2,
            color:
              stock === "out" ? colors.danger : stock === "low" ? colors.warning : colors.muted,
          }}
        >
          {stock === "out" ? "Tugagan" : qtyText}
        </Text>
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
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<CategoryFilter>("all");
  const debounced = useDebounce(search, 300);

  const { data: products, isLoading, isError, refetch, isRefetching } = useProducts({
    search: debounced,
    categoryId: cat,
  });
  const { data: categories } = useCategories();

  const chips: { id: CategoryFilter; name: string }[] = [
    { id: "all", name: "Barchasi" },
    ...(categories ?? []).map((c) => ({ id: c.id as CategoryFilter, name: c.name })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <Text className="pb-3 text-2xl font-medium text-primary-deep">Mahsulotlar</Text>

        {/* Qidiruv */}
        <View
          className="mb-3 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4"
          style={{ height: 48 }}
        >
          <Ionicons name="search" size={18} color={colors.tabInactive} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Mahsulot qidirish..."
            placeholderTextColor={colors.tabInactive}
            className="flex-1 text-base text-ink"
            style={{ height: 48 }}
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.tabInactive} />
            </Pressable>
          ) : null}
        </View>

        {/* Kategoriya chiplari */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
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
      </View>

      {/* Ro'yxat */}
      {isLoading ? (
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
          renderItem={({ item }) => <ProductRow item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

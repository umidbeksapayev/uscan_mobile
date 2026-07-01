import { useCallback, useEffect, useState, memo } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { searchSellProducts } from "@/features/sell/lookup";
import { useFrequentProducts } from "@/features/sell/use-frequent-products";
import { useCart, type CartItem } from "@/features/sell/cart-store";
import { cartTotal } from "@/features/sell/cart-total";
import { WeightSheet } from "@/features/sell/weight-sheet";
import { PaymentSheet } from "@/features/sell/payment-sheet";
import type { Product } from "@/types/database";

const FrequentTile = memo(function FrequentTile({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center rounded-2xl border border-line bg-surface p-2"
      style={{ width: 92 }}
    >
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={{ width: 48, height: 48, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
        </View>
      )}
      <Text className="mt-1.5 text-center text-xs text-ink" numberOfLines={1}>
        {product.name}
      </Text>
      <Text className="text-center text-xs font-medium text-primary-deep">
        {formatCurrency(product.selling_price)}
      </Text>
    </Pressable>
  );
});

type CartRowProps = { item: CartItem; onEditWeight: (item: CartItem) => void };

const CartRow = memo(function CartRow({ item, onEditWeight }: CartRowProps) {
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);

  const isWeight = item.product.sale_type === "weight";
  const accent = isWeight ? "#0F6E56" : colors.primary;
  const lineTotal = cartTotal([item]);

  return (
    <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: isWeight ? "#E1F5EE" : colors.primaryTint,
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "500", letterSpacing: 0.5, color: accent }}>
              {isWeight ? "VAZN" : "DONALI"}
            </Text>
          </View>
          <Text className="mt-2 text-base font-medium text-ink" numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text className="text-xs text-muted">
            {formatCurrency(item.product.selling_price)} / {isWeight ? "kg" : "dona"}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-base font-medium" style={{ color: accent }}>
            {formatCurrency(lineTotal)}
          </Text>
          <Pressable
            onPress={() => remove(item.product.id)}
            hitSlop={12}
            className="mt-2"
            accessibilityLabel="O'chirish"
          >
            <Ionicons name="trash-outline" size={20} color="#DB2777" />
          </Pressable>
        </View>
      </View>

      <View className="my-3 h-px bg-line" />

      {isWeight ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">Og'irlik</Text>
          <Pressable
            onPress={() => onEditWeight(item)}
            className="flex-row items-center gap-2 rounded-xl bg-bg px-3"
            style={{ height: 44 }}
          >
            <Text className="text-base font-medium text-ink">{formatWeight(item.quantity)}</Text>
            <Ionicons name="create-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">Miqdor</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => decrement(item.product.id)}
              className="items-center justify-center rounded-xl bg-bg"
              style={{ height: 44, width: 44 }}
            >
              <Ionicons name="remove" size={20} color={colors.ink} />
            </Pressable>
            <Text className="text-base font-medium text-ink" style={{ minWidth: 28, textAlign: "center" }}>
              {item.quantity}
            </Text>
            <Pressable
              onPress={() => increment(item.product.id)}
              className="items-center justify-center rounded-xl bg-primary-tint"
              style={{ height: 44, width: 44 }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
});

export default function SotuvScreen() {
  const router = useRouter();
  const shopId = useActiveShopId();

  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);
  const pendingWeight = useCart((s) => s.pendingWeight);
  const setPendingWeight = useCart((s) => s.setPendingWeight);

  const [payOpen, setPayOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const searching = search.trim().length > 0;

  // VAZN tezkor oynasi uchun mahsulot (+ tahrirlashda boshlang'ich kg)
  const [weightTarget, setWeightTarget] = useState<{ product: Product; initialKg?: number } | null>(
    null,
  );

  // Skanerда topilgan VAZN mahsulot → tezkor oynani ochamiz
  useEffect(() => {
    if (pendingWeight) {
      setWeightTarget({ product: pendingWeight });
      setPendingWeight(null);
    }
  }, [pendingWeight, setPendingWeight]);

  const { data: results } = useQuery({
    queryKey: ["sell-search", debounced.trim(), shopId],
    enabled: !!shopId && debounced.trim().length > 0,
    queryFn: () => searchSellProducts(debounced, shopId as string),
  });

  const { data: frequentProducts } = useFrequentProducts();

  const total = cartTotal(items);

  const onPick = useCallback(
    (p: Product) => {
      if (p.sale_type === "weight") {
        setWeightTarget({ product: p });
      } else {
        add(p);
      }
      setSearch("");
    },
    [add],
  );

  const onEditWeight = useCallback((it: CartItem) => {
    setWeightTarget({ product: it.product, initialKg: it.quantity });
  }, []);

  const renderCartItem = useCallback(
    ({ item }: { item: CartItem }) => <CartRow item={item} onEditWeight={onEditWeight} />,
    [onEditWeight],
  );

  function onCheckout() {
    setPayOpen(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-medium text-primary-deep">Sotuv</Text>
          {items.length > 0 ? (
            <Pressable onPress={clear} hitSlop={10}>
              <Text className="text-sm text-danger">Tozalash</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Skaner tugmasi */}
        <Pressable
          onPress={() => router.push("/scanner")}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
          style={{ height: 56 }}
        >
          <Ionicons name="barcode-outline" size={26} color="#fff" />
          <Text className="text-base font-medium text-white">Skaner</Text>
        </Pressable>

        {/* Qidiruv */}
        <View
          className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4"
          style={{ height: 48 }}
        >
          <Ionicons name="search" size={18} color={colors.tabInactive} />
          <TextInput
            testID="sell-search"
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

        {/* Tez-tez sotiladigan — shtrix-kodsiz/qidiruvsiz bir bosishda savatga */}
        {!searching && frequentProducts && frequentProducts.length > 0 ? (
          <View className="mb-1">
            <Text className="mb-2 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
              TEZ-TEZ SOTILADIGAN
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {frequentProducts.map((p) => (
                <FrequentTile key={p.id} product={p} onPress={() => onPick(p)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {searching ? (
        <FlatList
          data={results ?? []}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          ListEmptyComponent={
            <Text className="px-2 py-8 text-center text-muted">Topilmadi yoki qoldiq yo'q.</Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              testID={index === 0 ? "sell-result-first" : undefined}
              onPress={() => onPick(item)}
              className="mb-2 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-muted">
                  {item.sale_type === "weight" ? "Kg" : "Dona"}
                </Text>
              </View>
              <Text className="text-base font-medium text-primary-deep">
                {formatCurrency(item.selling_price)}
              </Text>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          )}
        />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
            <Ionicons name="cart-outline" size={36} color={colors.primary} />
          </View>
          <Text className="text-center text-base text-muted">
            Savat bo'sh. Skanerlang yoki qidiring.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.product.id}
          renderItem={renderCartItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}
          ListHeaderComponent={
            <Text className="pb-2 text-base font-medium text-ink">
              Savatcha <Text className="text-muted">({items.length})</Text>
            </Text>
          }
          removeClippedSubviews
        />
      )}

      {/* Pastki to'lov paneli */}
      {items.length > 0 && !searching ? (
        <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 14 }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-muted" style={{ letterSpacing: 0.5 }}>
              JAMI SUMMA
            </Text>
            <Text className="text-xl font-medium text-ink">{formatCurrency(total)}</Text>
          </View>
          <Pressable
            onPress={onCheckout}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
            style={{ height: 54 }}
          >
            <Text className="text-base font-medium text-white">To'lov</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {/* VAZN tezkor oynasi */}
      <WeightSheet
        product={weightTarget?.product ?? null}
        initialKg={weightTarget?.initialKg}
        onClose={() => setWeightTarget(null)}
        onConfirm={(kg) => {
          if (weightTarget) add(weightTarget.product, kg);
          setWeightTarget(null);
        }}
      />

      {/* To'lov oynasi */}
      <PaymentSheet
        visible={payOpen}
        total={total}
        shopId={shopId}
        items={items}
        onClose={() => setPayOpen(false)}
        onPaid={clear}
      />
    </SafeAreaView>
  );
}

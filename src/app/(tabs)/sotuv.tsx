import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useMemberships } from "@/features/auth/use-memberships";
import { searchSellProducts } from "@/features/sell/lookup";
import { useCart, type CartItem } from "@/features/sell/cart-store";
import { cartTotal } from "@/features/sell/cart-total";
import type { Product } from "@/types/database";

function CartRow({ item }: { item: CartItem }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);

  const isWeight = item.product.sale_type === "weight";
  const lineTotal = cartTotal([item]);

  return (
    <View className="mb-2 rounded-2xl border border-line bg-surface p-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: isWeight ? "#E1F5EE" : colors.primaryTint,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "500", color: isWeight ? "#0F6E56" : "#185FA5" }}>
              {isWeight ? "Kg" : "Dona"}
            </Text>
          </View>
          <Text className="mt-1.5 text-base font-medium text-ink" numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text className="text-xs text-muted">
            {formatCurrency(item.product.selling_price)} / {isWeight ? "kg" : "dona"}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-medium text-primary-deep">{formatCurrency(lineTotal)}</Text>
          <Pressable onPress={() => remove(item.product.id)} hitSlop={8} className="mt-1">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <View className="mt-3">
        {isWeight ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-muted">Vazn (kg):</Text>
            <TextInput
              defaultValue={String(item.quantity)}
              onChangeText={(t) => {
                const v = parseFloat(t.replace(",", "."));
                setQuantity(item.product.id, Number.isNaN(v) ? 0 : v);
              }}
              keyboardType="decimal-pad"
              className="rounded-xl border border-line bg-bg px-3 text-base text-ink"
              style={{ height: 40, minWidth: 96, textAlign: "center" }}
            />
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => decrement(item.product.id)}
              className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint"
            >
              <Ionicons name="remove" size={18} color={colors.primary} />
            </Pressable>
            <Text className="text-base font-medium text-ink" style={{ minWidth: 28, textAlign: "center" }}>
              {item.quantity}
            </Text>
            <Pressable
              onPress={() => increment(item.product.id)}
              className="h-9 w-9 items-center justify-center rounded-xl bg-primary-tint"
            >
              <Ionicons name="add" size={18} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SotuvScreen() {
  const router = useRouter();
  const { data: memberships } = useMemberships();
  const shopId = memberships?.[0]?.shop.id;

  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);

  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const searching = search.trim().length > 0;

  const { data: results } = useQuery({
    queryKey: ["sell-search", debounced.trim(), shopId],
    enabled: !!shopId && debounced.trim().length > 0,
    queryFn: () => searchSellProducts(debounced, shopId as string),
  });

  const total = cartTotal(items);

  function onPick(p: Product) {
    add(p);
    setSearch("");
  }

  function onCheckout() {
    Alert.alert("To'lov", "To'lov (checkout) F4 bosqichida quriladi.");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-medium text-primary-deep">Sotuv</Text>
          {items.length > 0 ? (
            <Pressable onPress={clear} hitSlop={8}>
              <Text className="text-sm text-danger">Tozalash</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Skaner tugmasi */}
        <Pressable
          onPress={() => router.push("/scanner")}
          className="mb-3 flex-row items-center gap-3 rounded-2xl bg-primary p-4"
        >
          <Ionicons name="scan-outline" size={26} color="#fff" />
          <View>
            <Text className="text-base font-medium text-white">Mahsulot skanerlash</Text>
            <Text className="text-xs" style={{ color: "#EAF2FE" }}>
              Shtrix-kodni kameraga tuting
            </Text>
          </View>
        </Pressable>

        {/* Qidiruv */}
        <View
          className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4"
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
          renderItem={({ item }) => (
            <Pressable
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
              <Ionicons name="add-circle" size={26} color={colors.primary} />
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}
          ListHeaderComponent={
            <Text className="pb-2 text-sm text-muted">Savat · {items.length} ta</Text>
          }
          renderItem={({ item }) => <CartRow item={item} />}
        />
      )}

      {/* Pastki to'lov paneli */}
      {items.length > 0 && !searching ? (
        <View
          className="flex-row items-center justify-between border-t border-line bg-surface px-4"
          style={{ paddingTop: 12, paddingBottom: 12 }}
        >
          <View>
            <Text className="text-xs text-muted">Jami</Text>
            <Text className="text-xl font-medium text-primary-deep">{formatCurrency(total)}</Text>
          </View>
          <Pressable
            onPress={onCheckout}
            className="flex-row items-center gap-2 rounded-2xl bg-primary"
            style={{ paddingHorizontal: 22, paddingVertical: 13 }}
          >
            <Text className="text-base font-medium text-white">To'lov</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

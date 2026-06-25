import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { useSupplyCart, type SupplyItem } from "@/features/supply/supply-store";
import { supplyTotalCost } from "@/features/supply/supply-math";
import { processPurchase } from "@/features/supply/supply-api";
import { AddSupplyItemSheet } from "@/features/supply/add-supply-item-sheet";
import { SupplierPickerSheet, type PickedSupplier } from "@/features/suppliers/supplier-picker-sheet";

function group(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function SupplyCartRow({ item }: { item: SupplyItem }) {
  const setQty = useSupplyCart((s) => s.setQty);
  const setCost = useSupplyCart((s) => s.setCost);
  const remove = useSupplyCart((s) => s.remove);
  const isWeight = item.product.sale_type === "weight";
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [costText, setCostText] = useState(String(item.costPrice));
  const lineTotal = Math.round(item.quantity * item.costPrice * 100) / 100;

  const miniInput = {
    height: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    textAlign: "center" as const,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "500" as const,
  };

  return (
    <View className="mb-2.5 rounded-2xl bg-surface p-3" style={{ borderWidth: 0.5, borderColor: colors.line }}>
      <View className="flex-row items-center gap-3">
        {item.product.image_url ? (
          <Image source={{ uri: item.product.image_url }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
          </View>
        )}
        <Text className="flex-1 text-base font-medium text-ink" numberOfLines={1}>{item.product.name}</Text>
        <Pressable onPress={() => remove(item.product.id)} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <View className="mt-2.5 flex-row items-center" style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text className="mb-1 text-xs text-muted">Miqdor ({isWeight ? "kg" : "dona"})</Text>
          <TextInput
            value={qtyText}
            onChangeText={(t) => {
              setQtyText(t);
              const n = parseFloat(t.replace(/\s/g, "").replace(",", ".")) || 0;
              setQty(item.product.id, isWeight ? n : Math.floor(n));
            }}
            keyboardType={isWeight ? "decimal-pad" : "number-pad"}
            style={miniInput}
          />
        </View>
        <Text className="mt-4 text-muted">×</Text>
        <View style={{ flex: 1.4 }}>
          <Text className="mb-1 text-xs text-muted">Tan narx</Text>
          <TextInput
            value={costText}
            onChangeText={(t) => {
              setCostText(t);
              setCost(item.product.id, parseFloat(t.replace(/\s/g, "")) || 0);
            }}
            keyboardType="number-pad"
            style={miniInput}
          />
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs text-muted">Eski tan narx: {formatCurrency(item.product.oldCost)}</Text>
        <Text className="text-sm font-semibold" style={{ color: colors.kirim }}>= {formatCurrency(lineTotal)}</Text>
      </View>
    </View>
  );
}

export default function SupplyScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  const { canPurchase } = useActivePermissions();
  const items = useSupplyCart((s) => s.items);
  const clear = useSupplyCart((s) => s.clear);

  const [supplier, setSupplier] = useState<PickedSupplier>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = supplyTotalCost(items);
  const allValid = items.length > 0 && items.every((i) => i.quantity > 0 && i.costPrice > 0);

  const mutation = useMutation({
    mutationFn: () =>
      processPurchase({
        shopId: shopId!,
        supplierId: supplier?.id ?? null,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity, cost_price: i.costPrice })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      clear();
      Alert.alert("Kirim saqlandi", "Mahsulotlar omborga qo'shildi.");
    },
    onError: (e) => Alert.alert("Xatolik", (e as Error)?.message ?? "Kirimni saqlab bo'lmadi"),
  });

  if (!canPurchase) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-row items-center gap-2 px-3 py-2">
          <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text className="text-xl font-semibold text-ink">Kirim</Text>
        </View>
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">
            Kirim faqat egasi yoki "Kirim" ruxsati bor xodimga ko'rinadi.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-xl font-semibold text-ink">Kirim</Text>
        <Pressable onPress={() => router.push("/suppliers")} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="people-outline" size={22} color={colors.kirim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        {/* Ta'minotchi tanlash */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mb-3 flex-row items-center justify-between rounded-2xl border border-line bg-surface px-4"
          style={{ height: 56 }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="business-outline" size={20} color={colors.kirim} />
            <Text className="text-base" style={{ color: supplier ? colors.ink : colors.muted }}>
              {supplier ? supplier.name : "Ta'minotchi tanlang (ixtiyoriy)"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
        </Pressable>

        {/* Kirim savati */}
        {items.length === 0 ? (
          <View className="items-center justify-center px-6" style={{ paddingVertical: 50, gap: 10 }}>
            <View className="h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: colors.kirimTint }}>
              <Ionicons name="cube-outline" size={36} color={colors.kirim} />
            </View>
            <Text className="text-center text-base text-muted">Hali mahsulot qo'shilmadi</Text>
          </View>
        ) : (
          items.map((it) => <SupplyCartRow key={it.product.id} item={it} />)
        )}

        {/* Mahsulot qo'shish */}
        <Pressable
          onPress={() => setAddOpen(true)}
          className="mt-1 flex-row items-center justify-center rounded-2xl"
          style={{ height: 52, gap: 8, borderWidth: 1.5, borderColor: colors.kirim, borderStyle: "dashed", backgroundColor: colors.kirimTint }}
        >
          <Ionicons name="add" size={22} color={colors.kirim} />
          <Text className="text-base font-semibold" style={{ color: colors.kirim }}>Mahsulot qo'shish</Text>
        </Pressable>
      </ScrollView>

      {/* Pastki panel: jami + tasdiqlash */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-4 pb-7 pt-3">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-muted">{items.length} mahsulot</Text>
          <Text className="text-lg font-bold text-ink">{formatCurrency(total)}</Text>
        </View>
        <Pressable
          disabled={!allValid || mutation.isPending}
          onPress={() => mutation.mutate()}
          className="flex-row items-center justify-center rounded-2xl"
          style={{ height: 54, gap: 8, backgroundColor: colors.kirim, opacity: !allValid || mutation.isPending ? 0.5 : 1 }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text className="text-base font-semibold text-white">Kirimni tasdiqlash</Text>
            </>
          )}
        </Pressable>
      </View>

      {shopId ? (
        <>
          <AddSupplyItemSheet visible={addOpen} shopId={shopId} onClose={() => setAddOpen(false)} />
          <SupplierPickerSheet
            visible={pickerOpen}
            shopId={shopId}
            onSelect={(s) => {
              setSupplier(s);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

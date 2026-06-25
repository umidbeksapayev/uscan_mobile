import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useScanReturn } from "@/features/products/scan-return";
import type { Product } from "@/types/database";
import { searchSupplyProducts } from "./supply-api";
import { useSupplyCart } from "./supply-store";

type Props = { visible: boolean; shopId: string; onClose: () => void };

export function AddSupplyItemSheet({ visible, shopId, onClose }: Props) {
  const router = useRouter();
  const add = useSupplyCart((s) => s.add);
  const scanCode = useScanReturn((s) => s.code);
  const setScanCode = useScanReturn((s) => s.setCode);

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [costText, setCostText] = useState("");

  const debounced = useDebounce(search, 300);
  const { data: results, isLoading } = useQuery({
    queryKey: ["supply-search", shopId, debounced],
    enabled: !!shopId && debounced.trim().length > 0 && !picked,
    queryFn: () => searchSupplyProducts(debounced, shopId),
  });

  // Sheet ochilganda tozalash
  useEffect(() => {
    if (visible) {
      setSearch("");
      setPicked(null);
      setQtyText("");
      setCostText("");
    }
  }, [visible]);

  // Skaner "form" rejimida shtrix-kodni qaytaradi → qidiruvga qo'yamiz
  useEffect(() => {
    if (visible && scanCode) {
      setSearch(scanCode);
      setPicked(null);
      setScanCode(null);
    }
  }, [visible, scanCode, setScanCode]);

  function choose(p: Product) {
    setPicked(p);
    setCostText(String(p.cost_price || "")); // eski tan narxni boshlang'ich qilib qo'yamiz
    setQtyText("");
  }

  const isWeight = picked?.sale_type === "weight";
  const qty = parseFloat(qtyText.replace(/\s/g, "").replace(",", ".")) || 0;
  const cost = parseFloat(costText.replace(/\s/g, "")) || 0;
  const canAdd = !!picked && qty > 0 && cost > 0;

  function onAdd() {
    if (!picked || !canAdd) return;
    add({
      product: {
        id: picked.id,
        name: picked.name,
        sale_type: picked.sale_type,
        image_url: picked.image_url,
        oldCost: picked.cost_price,
      },
      quantity: isWeight ? qty : Math.floor(qty),
      costPrice: cost,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
        <View
          onStartShouldSetResponder={() => true}
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: "82%" }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 }} />

          {!picked ? (
            <>
              <Text className="mb-3 text-lg font-medium text-ink">Mahsulot qo'shish</Text>
              <View className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-bg px-4" style={{ height: 50 }}>
                <Ionicons name="search" size={18} color={colors.tabInactive} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Nom yoki shtrix-kod..."
                  placeholderTextColor={colors.tabInactive}
                  className="flex-1 text-base text-ink"
                  style={{ height: 50 }}
                  autoCapitalize="none"
                  autoFocus
                />
                <Pressable onPress={() => router.push("/scanner?mode=form")} hitSlop={8}>
                  <Ionicons name="barcode-outline" size={24} color={colors.kirim} />
                </Pressable>
              </View>

              {isLoading ? (
                <ActivityIndicator color={colors.kirim} style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={results ?? []}
                  keyExtractor={(p) => p.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 320 }}
                  ListEmptyComponent={
                    debounced.trim() ? (
                      <Text className="py-6 text-center text-sm text-muted">Topilmadi</Text>
                    ) : (
                      <Text className="py-6 text-center text-sm text-muted">Mahsulot nomini yozing</Text>
                    )
                  }
                  renderItem={({ item }) => (
                    <Pressable onPress={() => choose(item)} className="flex-row items-center gap-3 py-2.5" style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
                      ) : (
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
                          <Ionicons name="cube-outline" size={18} color={colors.primary} />
                        </View>
                      )}
                      <View className="min-w-0 flex-1">
                        <Text className="text-base text-ink" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-xs text-muted">
                          Qoldiq: {item.sale_type === "weight" ? `${item.quantity} kg` : `${item.quantity} dona`}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </>
          ) : (
            <>
              {/* Tanlangan mahsulot */}
              <View className="mb-4 flex-row items-center gap-3">
                {picked.image_url ? (
                  <Image source={{ uri: picked.image_url }} style={{ width: 48, height: 48, borderRadius: 12 }} contentFit="cover" />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary-tint">
                    <Ionicons name="cube-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <Text className="flex-1 text-base font-medium text-ink" numberOfLines={2}>{picked.name}</Text>
                <Pressable onPress={() => setPicked(null)} hitSlop={8}>
                  <Text className="text-sm" style={{ color: colors.kirim }}>O'zgartirish</Text>
                </Pressable>
              </View>

              {/* Miqdor */}
              <Text className="mb-1 text-sm font-medium text-ink">Miqdor ({isWeight ? "kg" : "dona"})</Text>
              <TextInput
                value={qtyText}
                onChangeText={setQtyText}
                keyboardType={isWeight ? "decimal-pad" : "number-pad"}
                placeholder="0"
                placeholderTextColor={colors.tabInactive}
                className="mb-4 rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                style={{ height: 54 }}
                autoFocus
              />

              {/* Yangi tan narxi + eski reference */}
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-ink">Yangi tan narxi (so'm)</Text>
                <Text className="text-xs text-muted">Eski: {formatCurrency(picked.cost_price)}</Text>
              </View>
              <TextInput
                value={costText}
                onChangeText={setCostText}
                keyboardType="number-pad"
                placeholder={formatNumber(picked.cost_price || 0)}
                placeholderTextColor={colors.tabInactive}
                className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                style={{ height: 54 }}
              />

              <Pressable
                disabled={!canAdd}
                onPress={onAdd}
                className="mt-5 flex-row items-center justify-center rounded-2xl"
                style={{ height: 54, gap: 8, backgroundColor: colors.kirim, opacity: canAdd ? 1 : 0.5 }}
              >
                <Ionicons name="add" size={22} color="#fff" />
                <Text className="text-base font-semibold text-white">Qo'shish</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

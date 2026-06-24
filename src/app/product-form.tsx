import { useEffect, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useMemberships } from "@/features/auth/use-memberships";
import { useCategories } from "@/features/catalog/use-categories";
import { createProduct, updateProduct, getProduct } from "@/lib/products";
import { lowStockThreshold } from "@/features/products/low-stock";
import { useScanReturn } from "@/features/products/scan-return";
import type { SaleType } from "@/types/database";

const INPUT = "rounded-xl bg-bg px-4 text-base text-ink";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
        {title}
      </Text>
      <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 12 }}>
        {children}
      </View>
    </View>
  );
}

export default function ProductFormScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: memberships } = useMemberships();
  const shopId = memberships?.[0]?.shop.id;
  const isOwner = memberships?.[0]?.role !== "cashier";
  const { data: categories } = useCategories();

  const scanCode = useScanReturn((s) => s.code);
  const setScanCode = useScanReturn((s) => s.setCode);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saleType, setSaleType] = useState<SaleType>("unit");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["product", id],
    enabled: isEdit,
    queryFn: () => getProduct(id as string),
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setBarcode(existing.barcode ?? "");
      setCategoryId(existing.category_id);
      setSaleType(existing.sale_type);
      setSellingPrice(String(existing.selling_price));
      setCostPrice(String(existing.cost_price));
      setQuantity(String(existing.quantity));
    }
  }, [existing]);

  useEffect(() => {
    if (scanCode) {
      setBarcode(scanCode);
      setScanCode(null);
    }
  }, [scanCode, setScanCode]);

  const num = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;
  const sp = num(sellingPrice);
  const cp = num(costPrice);
  const q = num(quantity);
  const profit = sp - cp;
  const unit = saleType === "weight" ? "kg" : "dona";

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        shop_id: shopId as string,
        name: name.trim(),
        sale_type: saleType,
        selling_price: sp,
        cost_price: cp,
        quantity: q,
        low_stock_alert: lowStockThreshold(q, saleType), // avtomatik 20%
        barcode: barcode.trim() || null,
        category_id: categoryId,
      };
      return isEdit ? updateProduct(id as string, payload) : createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", id] });
      router.back();
    },
  });

  function onSave() {
    if (!name.trim()) {
      Alert.alert("Nomi kerak", "Mahsulot nomini kiriting.");
      return;
    }
    if (sp <= 0) {
      Alert.alert("Narx kerak", "Sotuv narxini kiriting.");
      return;
    }
    if (!shopId) return;
    mutation.mutate();
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-medium text-ink">
          {isEdit ? "Tahrirlash" : "Mahsulot qo'shish"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sotuv turi */}
        <View
          className="mb-4 flex-row rounded-2xl bg-surface p-1"
          style={{ borderWidth: 1, borderColor: colors.line }}
        >
          {(["unit", "weight"] as SaleType[]).map((t) => {
            const active = saleType === t;
            return (
              <Pressable
                key={t}
                onPress={() => setSaleType(t)}
                className="flex-1 items-center justify-center rounded-xl"
                style={{ height: 48, backgroundColor: active ? colors.primary : "transparent" }}
              >
                <Text style={{ fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                  {t === "unit" ? "DONALI (dona)" : "VAZN (kg)"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Section title="Mahsulot">
          <View style={{ gap: 6 }}>
            <Text className="text-sm font-medium text-ink">Nomi</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Mahsulot nomi"
              placeholderTextColor={colors.tabInactive}
              className={INPUT}
              style={{ height: 52 }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text className="text-sm font-medium text-ink">Shtrix-kod</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Kod yoki skanerlang"
                placeholderTextColor={colors.tabInactive}
                className={`flex-1 ${INPUT}`}
                style={{ height: 52 }}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => router.push("/scanner?mode=form")}
                className="items-center justify-center rounded-xl bg-primary-tint"
                style={{ width: 52, height: 52 }}
              >
                <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title="Narx">
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1" style={{ gap: 6 }}>
              <Text className="text-sm font-medium text-ink">Sotuv narxi</Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.tabInactive}
                className={INPUT}
                style={{ height: 52 }}
              />
            </View>
            {isOwner ? (
              <View className="flex-1" style={{ gap: 6 }}>
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm font-medium text-ink">Tan narxi</Text>
                  <Ionicons name="lock-closed" size={11} color={colors.muted} />
                </View>
                <TextInput
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.tabInactive}
                  className={INPUT}
                  style={{ height: 52 }}
                />
              </View>
            ) : null}
          </View>
          {isOwner && sp > 0 && cp > 0 ? (
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="trending-up"
                size={16}
                color={profit >= 0 ? colors.success : colors.danger}
              />
              <Text className="text-sm" style={{ color: profit >= 0 ? colors.success : colors.danger }}>
                Foyda: {formatCurrency(profit)} ({Math.round((profit / cp) * 100)}%)
              </Text>
            </View>
          ) : null}
        </Section>

        <Section title="Qoldiq">
          <View style={{ gap: 6 }}>
            <Text className="text-sm font-medium text-ink">Miqdor ({unit})</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType={saleType === "weight" ? "decimal-pad" : "number-pad"}
              placeholder="0"
              placeholderTextColor={colors.tabInactive}
              className={INPUT}
              style={{ height: 52 }}
            />
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="notifications-outline" size={15} color={colors.muted} />
            <Text className="text-xs text-muted">
              {q > 0
                ? `${lowStockThreshold(q, saleType)} ${unit} (20%) qolganda avtomatik ogohlantiriladi`
                : "Qoldiq 20% ga yetganda avtomatik ogohlantiriladi"}
            </Text>
          </View>
        </Section>

        <View className="mb-2">
          <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
            Kategoriya
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: null as string | null, name: "Kategoriyasiz" }, ...(categories ?? [])].map((c) => {
              const active = categoryId === c.id;
              return (
                <Pressable
                  key={c.id ?? "none"}
                  onPress={() => setCategoryId(c.id)}
                  style={{
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.line,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {mutation.isError ? (
          <Text className="mt-2 text-center text-sm text-danger">
            {(mutation.error as Error)?.message ?? "Saqlashda xatolik"}
          </Text>
        ) : null}
      </ScrollView>

      {/* Sticky saqlash — thumb zone */}
      <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 8 }}>
        <Button
          label={isEdit ? "Saqlash" : "Qo'shish"}
          onPress={onSave}
          loading={mutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useMemberships } from "@/features/auth/use-memberships";
import { useCategories } from "@/features/catalog/use-categories";
import { createProduct, updateProduct, getProduct } from "@/lib/products";
import { useScanReturn } from "@/features/products/scan-return";
import type { SaleType } from "@/types/database";

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
  const [lowStock, setLowStock] = useState("");

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
      setLowStock(String(existing.low_stock_alert));
    }
  }, [existing]);

  // Skanerdan qaytgan kod → shtrix-kod maydoni
  useEffect(() => {
    if (scanCode) {
      setBarcode(scanCode);
      setScanCode(null);
    }
  }, [scanCode, setScanCode]);

  const num = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        shop_id: shopId as string,
        name: name.trim(),
        sale_type: saleType,
        selling_price: num(sellingPrice),
        cost_price: num(costPrice),
        quantity: num(quantity),
        low_stock_alert: num(lowStock),
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
    if (num(sellingPrice) <= 0) {
      Alert.alert("Narx kerak", "Sotuv narxini kiriting.");
      return;
    }
    if (!shopId) return;
    mutation.mutate();
  }

  const inputCls = "rounded-2xl border border-line bg-surface px-4 text-base text-ink";

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-medium text-ink">
          {isEdit ? "Mahsulotni tahrirlash" : "Mahsulot qo'shish"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Nomi" value={name} onChangeText={setName} placeholder="Mahsulot nomi" />

        {/* Shtrix-kod + skaner */}
        <View style={{ gap: 6 }}>
          <Text className="text-sm font-medium text-ink">Shtrix-kod</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Kod yoki skanerlang"
              placeholderTextColor={colors.tabInactive}
              className={`flex-1 ${inputCls}`}
              style={{ height: 52 }}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => router.push("/scanner?mode=form")}
              className="items-center justify-center rounded-2xl bg-primary-tint"
              style={{ width: 52, height: 52 }}
            >
              <Ionicons name="barcode-outline" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Kategoriya */}
        <View style={{ gap: 6 }}>
          <Text className="text-sm font-medium text-ink">Kategoriya</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: null, name: "Kategoriyasiz" }, ...(categories ?? [])].map((c) => {
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

        {/* Sotuv turi */}
        <View style={{ gap: 6 }}>
          <Text className="text-sm font-medium text-ink">Sotuv turi</Text>
          <View className="flex-row rounded-2xl bg-surface p-1" style={{ borderWidth: 1, borderColor: colors.line }}>
            {(["unit", "weight"] as SaleType[]).map((t) => {
              const active = saleType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setSaleType(t)}
                  className="flex-1 items-center justify-center rounded-xl"
                  style={{ height: 44, backgroundColor: active ? colors.primary : "transparent" }}
                >
                  <Text style={{ fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                    {t === "unit" ? "DONALI" : "VAZN"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field
          label="Sotuv narxi (so'm)"
          value={sellingPrice}
          onChangeText={setSellingPrice}
          placeholder="0"
          keyboardType="number-pad"
        />

        {/* Tan narxi — faqat egasi */}
        {isOwner ? (
          <View style={{ gap: 6 }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-medium text-ink">Tan narxi (so'm)</Text>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#E7F6EE" }}>
                <Text style={{ fontSize: 10, fontWeight: "500", color: "#0F6E56" }}>
                  Faqat do'kon egasi uchun
                </Text>
              </View>
            </View>
            <TextInput
              value={costPrice}
              onChangeText={setCostPrice}
              placeholder="0"
              placeholderTextColor={colors.tabInactive}
              keyboardType="number-pad"
              className={inputCls}
              style={{ height: 52 }}
            />
          </View>
        ) : null}

        <Field
          label={saleType === "weight" ? "Miqdor (kg)" : "Miqdor (dona)"}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType={saleType === "weight" ? "decimal-pad" : "number-pad"}
        />

        <Field
          label="Kam qoldiq ogohlantirishi (ixtiyoriy)"
          value={lowStock}
          onChangeText={setLowStock}
          placeholder="0"
          keyboardType={saleType === "weight" ? "decimal-pad" : "number-pad"}
        />

        {mutation.isError ? (
          <Text className="text-center text-sm text-danger">
            {(mutation.error as Error)?.message ?? "Saqlashda xatolik"}
          </Text>
        ) : null}

        <View className="mt-2">
          <Button
            label={isEdit ? "Saqlash" : "Qo'shish"}
            onPress={onSave}
            loading={mutation.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

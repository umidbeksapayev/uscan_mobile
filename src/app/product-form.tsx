import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useMemberships } from "@/features/auth/use-memberships";
import { useCategories } from "@/features/catalog/use-categories";
import { createProduct, updateProduct, getProduct } from "@/lib/products";
import { lowStockThreshold } from "@/features/products/low-stock";
import { validateProductInput } from "@/features/products/validate-product";
import { useScanReturn } from "@/features/products/scan-return";
import { pickAndUpload } from "@/features/products/upload-image";
import { CategorySheet } from "@/features/products/category-sheet";
import { useLabelPrint } from "@/features/labels/use-print-label";
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
  const [catOpen, setCatOpen] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("unit");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setImageUrl(existing.image_url ?? null);
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
  const categoryName =
    (categories ?? []).find((c) => c.id === categoryId)?.name ?? "Kategoriyasiz";

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        shop_id: shopId as string,
        name: name.trim(),
        sale_type: saleType,
        selling_price: sp,
        cost_price: cp,
        quantity: q,
        low_stock_alert: lowStockThreshold(q, saleType),
        barcode: barcode.trim() || null,
        category_id: categoryId,
        image_url: imageUrl,
      };
      return isEdit ? updateProduct(id as string, payload) : createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", id] });
      router.back();
    },
  });

  const { print: printLabel, printing: labelPrinting } = useLabelPrint();

  async function doPick(source: "camera" | "library") {
    if (!shopId) return;
    setUploading(true);
    try {
      const url = await pickAndUpload(source, shopId);
      if (url) setImageUrl(url);
    } catch (e) {
      toast.error("Xato", e instanceof Error ? e.message : "Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  }

  function chooseImage() {
    Alert.alert("Mahsulot rasmi", undefined, [
      { text: "Kamera", onPress: () => doPick("camera") },
      { text: "Galereyadan", onPress: () => doPick("library") },
      ...(imageUrl
        ? [{ text: "Rasmni o'chirish", style: "destructive" as const, onPress: () => setImageUrl(null) }]
        : []),
      { text: "Bekor", style: "cancel" as const },
    ]);
  }

  function onSave() {
    const err = validateProductInput({ name, sellingPrice: sp, costPrice: cp, quantity: q });
    if (err) {
      toast.error(err.title, err.message);
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

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
      >
        {/* Rasm */}
        <Pressable onPress={chooseImage} className="mb-4 self-center" style={{ width: 120, height: 120 }}>
          {uploading ? (
            <View className="h-full w-full items-center justify-center rounded-2xl border border-line bg-surface">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : imageUrl ? (
            <View>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 120, height: 120, borderRadius: 16 }}
                contentFit="cover"
              />
              <View
                className="absolute bottom-1 right-1 h-7 w-7 items-center justify-center rounded-full bg-primary"
                style={{ borderWidth: 2, borderColor: "#fff" }}
              >
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </View>
          ) : (
            <View
              className="h-full w-full items-center justify-center rounded-2xl bg-primary-tint"
              style={{ borderWidth: 1, borderColor: colors.line, borderStyle: "dashed" }}
            >
              <Ionicons name="camera-outline" size={28} color={colors.primary} />
              <Text className="mt-1 text-xs text-muted">Rasm qo'shish</Text>
            </View>
          )}
        </Pressable>

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
          {/* Sotuv turi — miqdor ustida */}
          <View className="flex-row rounded-xl bg-bg p-1">
            {(["unit", "weight"] as SaleType[]).map((t) => {
              const active = saleType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setSaleType(t)}
                  className="flex-1 items-center justify-center rounded-lg"
                  style={{ height: 42, backgroundColor: active ? colors.primary : "transparent" }}
                >
                  <Text style={{ fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                    {t === "unit" ? "DONALI (dona)" : "VAZN (kg)"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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

        {/* Kategoriya — bosiladigan qator */}
        <Pressable
          onPress={() => setCatOpen(true)}
          className="mb-2 flex-row items-center justify-between rounded-2xl border border-line bg-surface p-4"
          style={{ height: 56 }}
        >
          <Text className="text-base font-medium text-ink">Kategoriya</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-base text-muted">{categoryName}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Pressable>

        {mutation.isError ? (
          <Text className="mt-2 text-center text-sm text-danger">
            {(mutation.error as Error)?.message ?? "Saqlashda xatolik"}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 8 }}>
        {isEdit && existing ? (
          <View className="mb-2">
            <Button
              variant="ghost"
              label="Yorliq chop etish"
              onPress={() => printLabel([existing])}
              loading={labelPrinting}
            />
          </View>
        ) : null}
        <Button
          label={isEdit ? "Saqlash" : "Qo'shish"}
          onPress={onSave}
          loading={mutation.isPending}
        />
      </View>

      <CategorySheet
        visible={catOpen}
        categories={categories ?? []}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setCatOpen(false)}
      />
    </SafeAreaView>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { colors } from "@/theme/colors";
import { formatCurrency, formatWeight } from "@/lib/format";
import type { Sale, SaleItem } from "@/types/database";
import { useReturnedQuantities, useProcessReturn } from "./use-history";
import { returnableQty, refundPreview } from "./returnable";

type Props = {
  visible: boolean;
  sale: Sale | null;
  shopId: string;
  onClose: () => void;
};

/** Bitta sale_item uchun qaytarish qatori. */
function ReturnRow({
  item,
  max,
  value,
  onChange,
}: {
  item: SaleItem;
  max: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const isWeight = item.sale_type === "weight";
  const disabled = max <= 0;

  return (
    <View
      className="mb-2 flex-row items-center gap-3 rounded-2xl bg-bg p-2.5"
      style={{ borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.55 : 1 }}
    >
      {item.product?.image_url ? (
        <Image
          source={{ uri: item.product.image_url }}
          style={{ width: 44, height: 44, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {item.product?.name ?? "—"}
        </Text>
        <Text className="mt-0.5 text-xs text-muted">
          Qaytarish mumkin: {isWeight ? formatWeight(max) : `${max} dona`}
        </Text>
      </View>

      <View className="items-end" style={{ gap: 4 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          keyboardType={isWeight ? "decimal-pad" : "number-pad"}
          placeholder="0"
          placeholderTextColor={colors.tabInactive}
          className="rounded-xl border border-line bg-surface text-center text-base font-medium text-ink"
          style={{ width: 72, height: 40 }}
        />
        <Pressable onPress={() => onChange(String(max))} disabled={disabled} hitSlop={6}>
          <Text className="text-xs font-medium text-primary">Hammasi</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Qaytarish oynasi (bottom-sheet): sotuvdagi mahsulotlarni to'liq/qisman qaytarish.
 * Faqat egasi ko'radi (returns RLS = egasi) — tugma tarix ekranida gate qilingan.
 */
export function ReturnSheet({ visible, sale, shopId, onClose }: Props) {
  const { data: returnedMap } = useReturnedQuantities(visible ? sale?.id : undefined);
  const mutation = useProcessReturn();
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");

  const items = useMemo(() => sale?.items ?? [], [sale]);

  useEffect(() => {
    if (visible) {
      setQtys({});
      setReason("");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sale?.id]);

  function setQty(item: SaleItem, max: number, raw: string) {
    // VAZN: kasrli; DONALI: butun. Maksimaldan oshmasin.
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    let n = parseFloat(cleaned);
    if (!isFinite(n) || n < 0) n = 0;
    if (item.sale_type === "unit") n = Math.floor(n);
    if (n > max) n = max;
    setQtys((prev) => ({ ...prev, [item.id]: cleaned === "" ? "" : String(n) }));
  }

  const preview = refundPreview(items, qtys);
  const canSubmit = preview > 0 && !mutation.isPending;

  async function handleSubmit() {
    if (!sale) return;
    const payload = items
      .map((it) => ({ sale_item_id: it.id, quantity: Number(qtys[it.id]) || 0 }))
      .filter((x) => x.quantity > 0);
    if (payload.length === 0) return;
    try {
      await mutation.mutateAsync({ shopId, saleId: sale.id, items: payload, reason: reason || null });
      onClose();
    } catch {
      // mutation.isError UI'da ko'rsatiladi
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              marginBottom: 16,
            }}
          />

          <Text className="mb-3 text-lg font-medium text-ink">Mahsulotni qaytarish</Text>

          <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
            {items.map((it) => {
              const max = returnableQty(it.quantity_sold, returnedMap?.[it.id] ?? 0);
              return (
                <ReturnRow
                  key={it.id}
                  item={it}
                  max={max}
                  value={qtys[it.id] ?? ""}
                  onChange={(v) => setQty(it, max, v)}
                />
              );
            })}
          </ScrollView>

          <Text className="mb-1 mt-3 text-sm font-medium text-ink">Sabab (ixtiyoriy)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Masalan: nuqsonli, mijoz qaytardi…"
            placeholderTextColor={colors.tabInactive}
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={{ height: 48 }}
          />

          <View
            className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors.primaryTint }}
          >
            <Text className="text-sm text-muted">Qaytariladigan summa</Text>
            <Text className="text-lg font-medium" style={{ color: colors.primaryDeep }}>
              {formatCurrency(preview)}
            </Text>
          </View>

          {mutation.isError ? (
            <Text className="mt-3 text-center text-sm text-danger">
              {(mutation.error as Error)?.message ?? "Xatolik yuz berdi"}
            </Text>
          ) : null}

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center justify-center rounded-2xl bg-bg"
              style={{ height: 54, borderWidth: 1, borderColor: colors.line }}
            >
              <Text className="text-base font-medium text-muted">Bekor</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit}
              onPress={handleSubmit}
              className="flex-1 flex-row items-center justify-center rounded-2xl"
              style={{ height: 54, backgroundColor: colors.danger, opacity: canSubmit ? 1 : 0.5 }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-medium text-white">Qaytarishni tasdiqlash</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

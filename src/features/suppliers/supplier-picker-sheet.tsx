import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { BottomSheetTextInput, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { ListRow } from "@/components/ui/list-row";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useSuppliers, useCreateSupplier } from "./use-suppliers";
import type { Supplier } from "@/types/database";

export type PickedSupplier = { id: string; name: string } | null;

type Props = {
  visible: boolean;
  shopId: string;
  onSelect: (s: PickedSupplier) => void;
  onClose: () => void;
};

export function SupplierPickerSheet({ visible, shopId, onSelect, onClose }: Props) {
  const colors = useColors();

  const { t } = useTranslation();
  const { data: suppliers, isLoading } = useSuppliers();
  const createMut = useCreateSupplier();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = suppliers ?? [];
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q));
  }, [suppliers, search]);

  /** Barqaror `renderItem` (audit A10) — `ListRow` memo bilan juftlashadi. */
  const renderSupplier = useCallback(
    ({ item }: { item: Supplier }) => (
      <ListRow
        onPress={() => onSelect({ id: item.id, name: item.name })}
        leading={
          <Avatar name={item.name} size={36} tone={{ bg: colors.kirimTint, text: colors.kirim }} />
        }
        title={item.name}
        subtitle={item.phone ?? undefined}
      />
    ),
    [onSelect, colors.kirimTint, colors.kirim],
  );

  async function onQuickAdd() {
    if (!newName.trim()) return;
    try {
      const s = await createMut.mutateAsync({ shop_id: shopId, name: newName, phone: newPhone });
      setAdding(false);
      setNewName("");
      setNewPhone("");
      onSelect({ id: s.id, name: s.name });
    } catch (e) {
      toast.error(t("common.error"), e instanceof Error ? e.message : t("common.addFailed"));
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} contentStyle={{ maxHeight: "80%" }}>
          <Text className="mb-3 text-lg font-medium text-ink">{t("suppliers.pickTitle")}</Text>

          {adding ? (
            <View style={{ gap: 10 }}>
              <BottomSheetTextInput value={newName} onChangeText={setNewName} placeholder={`${t("suppliers.name")} *`} placeholderTextColor={colors.tabInactive} className="rounded-2xl border border-line bg-bg px-4 text-base text-ink" style={{ height: 50 }} autoFocus />
              <BottomSheetTextInput value={newPhone} onChangeText={setNewPhone} placeholder={`${t("suppliers.phone")} (${t("common.optional").toLowerCase()})`} placeholderTextColor={colors.tabInactive} keyboardType="phone-pad" className="rounded-2xl border border-line bg-bg px-4 text-base text-ink" style={{ height: 50 }} />
              <View className="flex-row gap-3">
                <Pressable onPress={() => setAdding(false)} className="flex-1 items-center justify-center rounded-2xl bg-bg" style={{ height: 50, borderWidth: 1, borderColor: colors.line }}>
                  <Text className="text-base font-medium text-muted">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable disabled={!newName.trim() || createMut.isPending} onPress={onQuickAdd} className="flex-1 flex-row items-center justify-center rounded-2xl" style={{ height: 50, backgroundColor: colors.kirim, opacity: !newName.trim() || createMut.isPending ? 0.5 : 1 }}>
                  {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-white">{t("common.add")}</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-bg px-4" style={{ height: 46 }}>
                <Ionicons name="search" size={18} color={colors.tabInactive} />
                <BottomSheetTextInput value={search} onChangeText={setSearch} placeholder={t("suppliers.searchPlaceholder")} placeholderTextColor={colors.tabInactive} className="flex-1 text-base text-ink" style={{ height: 46 }} autoCapitalize="none" />
              </View>

              <Pressable onPress={() => setAdding(true)} className="mb-2 flex-row items-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.kirimTint }}>
                <Ionicons name="add-circle" size={18} color={colors.kirim} />
                <Text className="text-base font-medium" style={{ color: colors.kirim }}>{t("suppliers.newSupplier")}</Text>
              </Pressable>

              {/* Ta'minotchisiz kirim */}
              <Pressable onPress={() => onSelect(null)} className="mb-1 flex-row items-center gap-2 py-2.5">
                <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
                <Text className="text-base text-muted">{t("purchases.noSupplier")}</Text>
              </Pressable>

              {isLoading ? (
                <ActivityIndicator color={colors.kirim} style={{ marginVertical: 20 }} />
              ) : (
                <BottomSheetFlatList
                  data={filtered}
                  keyExtractor={(s) => s.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 300 }}
                  ListEmptyComponent={<Text className="py-6 text-center text-sm text-muted">{search ? t("suppliers.notFound") : t("suppliers.empty")}</Text>}
                  renderItem={renderSupplier}
                />
              )}
            </>
          )}
    </BottomSheet>
  );
}

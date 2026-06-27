import { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { useSuppliers, useCreateSupplier } from "./use-suppliers";

export type PickedSupplier = { id: string; name: string } | null;

type Props = {
  visible: boolean;
  shopId: string;
  onSelect: (s: PickedSupplier) => void;
  onClose: () => void;
};

export function SupplierPickerSheet({ visible, shopId, onSelect, onClose }: Props) {
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

  async function onQuickAdd() {
    if (!newName.trim()) return;
    try {
      const s = await createMut.mutateAsync({ shop_id: shopId, name: newName, phone: newPhone });
      setAdding(false);
      setNewName("");
      setNewPhone("");
      onSelect({ id: s.id, name: s.name });
    } catch (e) {
      toast.error("Xatolik", e instanceof Error ? e.message : "Qo'shib bo'lmadi");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
        <View
          onStartShouldSetResponder={() => true}
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: "80%" }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 }} />
          <Text className="mb-3 text-lg font-medium text-ink">Ta'minotchi tanlash</Text>

          {adding ? (
            <View style={{ gap: 10 }}>
              <TextInput value={newName} onChangeText={setNewName} placeholder="Nomi *" placeholderTextColor={colors.tabInactive} className="rounded-2xl border border-line bg-bg px-4 text-base text-ink" style={{ height: 50 }} autoFocus />
              <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="Telefon (ixtiyoriy)" placeholderTextColor={colors.tabInactive} keyboardType="phone-pad" className="rounded-2xl border border-line bg-bg px-4 text-base text-ink" style={{ height: 50 }} />
              <View className="flex-row gap-3">
                <Pressable onPress={() => setAdding(false)} className="flex-1 items-center justify-center rounded-2xl bg-bg" style={{ height: 50, borderWidth: 1, borderColor: colors.line }}>
                  <Text className="text-base font-medium text-muted">Bekor</Text>
                </Pressable>
                <Pressable disabled={!newName.trim() || createMut.isPending} onPress={onQuickAdd} className="flex-1 flex-row items-center justify-center rounded-2xl" style={{ height: 50, backgroundColor: colors.kirim, opacity: !newName.trim() || createMut.isPending ? 0.5 : 1 }}>
                  {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-semibold text-white">Qo'shish</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-bg px-4" style={{ height: 46 }}>
                <Ionicons name="search" size={18} color={colors.tabInactive} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Nom yoki telefon..." placeholderTextColor={colors.tabInactive} className="flex-1 text-base text-ink" style={{ height: 46 }} autoCapitalize="none" />
              </View>

              <Pressable onPress={() => setAdding(true)} className="mb-2 flex-row items-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.kirimTint }}>
                <Ionicons name="add-circle" size={18} color={colors.kirim} />
                <Text className="text-base font-medium" style={{ color: colors.kirim }}>Yangi ta'minotchi</Text>
              </Pressable>

              {/* Ta'minotchisiz kirim */}
              <Pressable onPress={() => onSelect(null)} className="mb-1 flex-row items-center gap-2 py-2.5">
                <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
                <Text className="text-base text-muted">Ta'minotchisiz</Text>
              </Pressable>

              {isLoading ? (
                <ActivityIndicator color={colors.kirim} style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(s) => s.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 300 }}
                  ListEmptyComponent={<Text className="py-6 text-center text-sm text-muted">{search ? "Topilmadi" : "Hali ta'minotchi yo'q"}</Text>}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => onSelect({ id: item.id, name: item.name })} className="flex-row items-center gap-3 py-2.5" style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}>
                      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.kirimTint }}>
                        <Text className="font-semibold" style={{ color: colors.kirim }}>{item.name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-base text-ink" numberOfLines={1}>{item.name}</Text>
                        {item.phone ? <Text className="text-xs text-muted">{item.phone}</Text> : null}
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

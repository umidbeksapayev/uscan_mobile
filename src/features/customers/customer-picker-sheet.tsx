import { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useCustomersWithBalance, useCreateCustomer } from "./use-customers";

export type PickedCustomer = { id: string; name: string };

type Props = {
  visible: boolean;
  shopId: string;
  onSelect: (c: PickedCustomer) => void;
  onClose: () => void;
};

/** Checkout uchun mijoz tanlash: qidiriladigan ro'yxat + tezkor "Yangi mijoz". */
export function CustomerPickerSheet({ visible, shopId, onSelect, onClose }: Props) {
  const { data: customers, isLoading } = useCustomersWithBalance();
  const createMut = useCreateCustomer();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = customers ?? [];
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q));
  }, [customers, search]);

  async function onQuickAdd() {
    if (!newName.trim()) return;
    try {
      const c = await createMut.mutateAsync({ shop_id: shopId, name: newName, phone: newPhone });
      setAdding(false);
      setNewName("");
      setNewPhone("");
      onSelect({ id: c.id, name: c.name });
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Qo'shib bo'lmadi");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            maxHeight: "80%",
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 }} />
          <Text className="mb-3 text-lg font-medium text-ink">Mijoz tanlash</Text>

          {adding ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Ism *"
                placeholderTextColor={colors.tabInactive}
                className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
                style={{ height: 50 }}
                autoFocus
              />
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Telefon (ixtiyoriy)"
                placeholderTextColor={colors.tabInactive}
                keyboardType="phone-pad"
                className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
                style={{ height: 50 }}
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setAdding(false)}
                  className="flex-1 items-center justify-center rounded-2xl bg-bg"
                  style={{ height: 50, borderWidth: 1, borderColor: colors.line }}
                >
                  <Text className="text-base font-medium text-muted">Bekor</Text>
                </Pressable>
                <Pressable
                  disabled={!newName.trim() || createMut.isPending}
                  onPress={onQuickAdd}
                  className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary"
                  style={{ height: 50, opacity: !newName.trim() || createMut.isPending ? 0.5 : 1 }}
                >
                  {createMut.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Qo'shish</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View
                className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-bg px-4"
                style={{ height: 46 }}
              >
                <Ionicons name="search" size={18} color={colors.tabInactive} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Ism yoki telefon..."
                  placeholderTextColor={colors.tabInactive}
                  className="flex-1 text-base text-ink"
                  style={{ height: 46 }}
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                onPress={() => setAdding(true)}
                className="mb-2 flex-row items-center gap-2 rounded-2xl px-4 py-3"
                style={{ backgroundColor: colors.primaryTint }}
              >
                <Ionicons name="person-add" size={18} color={colors.primary} />
                <Text className="text-base font-medium text-primary">Yangi mijoz qo'shish</Text>
              </Pressable>

              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(c) => c.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 320 }}
                  ListEmptyComponent={
                    <Text className="py-6 text-center text-sm text-muted">
                      {search ? "Topilmadi" : "Hali mijoz yo'q"}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => onSelect({ id: item.id, name: item.name })}
                      className="flex-row items-center gap-3 py-2.5"
                      style={{ borderTopWidth: 0.5, borderTopColor: colors.line }}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-tint">
                        <Text className="font-semibold text-primary">{item.name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-base text-ink" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.phone ? <Text className="text-xs text-muted">{item.phone}</Text> : null}
                      </View>
                      {item.balance > 0 ? (
                        <Text className="text-sm font-medium" style={{ color: "#B42318" }}>
                          {formatCurrency(item.balance)}
                        </Text>
                      ) : null}
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

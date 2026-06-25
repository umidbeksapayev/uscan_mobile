import { useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { useSuppliers } from "@/features/suppliers/use-suppliers";
import { SupplierFormSheet } from "@/features/suppliers/supplier-form-sheet";
import type { Supplier } from "@/types/database";

export default function SuppliersScreen() {
  const router = useRouter();
  const shopId = useActiveShopId();
  const { data: suppliers, isLoading, refetch, isRefetching } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Ta'minotchilar</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.kirim} />
        </View>
      ) : (suppliers?.length ?? 0) === 0 ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 10 }}>
          <View className="h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: colors.kirimTint }}>
            <Ionicons name="people-outline" size={36} color={colors.kirim} />
          </View>
          <Text className="text-center text-base text-muted">Hali ta'minotchi yo'q. "+" bilan qo'shing.</Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEdit(item)}
              className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-surface p-3.5"
              style={{ borderWidth: 0.5, borderColor: colors.line }}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.kirimTint }}>
                <Text className="text-base font-semibold" style={{ color: colors.kirim }}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-medium text-ink" numberOfLines={1}>{item.name}</Text>
                {item.phone ? <Text className="text-xs text-muted">{item.phone}</Text> : null}
                {item.note ? <Text className="text-xs text-muted" numberOfLines={1}>{item.note}</Text> : null}
              </View>
              <Ionicons name="create-outline" size={20} color={colors.tabInactive} />
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={openNew}
        style={{ position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.kirim, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {shopId ? (
        <SupplierFormSheet visible={formOpen} shopId={shopId} supplier={editing} onClose={() => setFormOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}

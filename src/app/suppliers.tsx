import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { ListItemCard } from "@/components/ui/list-item-card";
import { Avatar } from "@/components/ui/avatar";
import { shadowMd } from "@/theme/shadows";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { useSuppliers } from "@/features/suppliers/use-suppliers";
import { SupplierFormSheet } from "@/features/suppliers/supplier-form-sheet";
import type { Supplier } from "@/types/database";
import { radius } from "@/theme/tokens";

export default function SuppliersScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const shopId = useActiveShopId();
  const { data: suppliers, isLoading, refetch, isRefetching } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  const openEdit = useCallback((s: Supplier) => {
    setEditing(s);
    setFormOpen(true);
  }, []);

  /** Barqaror `renderItem` (audit A10) — `ListItemCard` memo bilan juftlashadi. */
  const renderSupplier = useCallback(
    ({ item }: { item: Supplier }) => (
      <ListItemCard
        onPress={() => openEdit(item)}
        leading={<Avatar name={item.name} tone={{ bg: colors.kirimTint, text: colors.kirim }} />}
        title={item.name}
        subtitle={
          <>
            {item.phone ? <Text className="text-xs text-muted">{item.phone}</Text> : null}
            {item.note ? (
              <Text className="text-xs text-muted" numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </>
        }
        trailing={<Ionicons name="create-outline" size={20} color={colors.tabInactive} />}
      />
    ),
    [openEdit, colors.kirimTint, colors.kirim, colors.tabInactive],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Orqaga")}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">{t("suppliers.title")}</Text>
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
          <Text className="text-center text-base text-muted">{t("suppliers.emptyAddHint")}</Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 90 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={renderSupplier}
        />
      )}

      <Pressable
        onPress={openNew}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.addSupplier", "Yangi ta'minotchi qo'shish")}
        style={{ position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.kirim, alignItems: "center", justifyContent: "center", ...shadowMd(colors.shadow) }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {shopId ? (
        <SupplierFormSheet visible={formOpen} shopId={shopId} supplier={editing} onClose={() => setFormOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}

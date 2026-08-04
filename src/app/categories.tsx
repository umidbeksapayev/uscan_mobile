import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { ListItemCard } from "@/components/ui/list-item-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useActivePermissions } from "@/features/auth/use-memberships";
import {
  useCategoriesWithCount,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
} from "@/features/catalog/use-categories";
import type { CategoryWithCount } from "@/types/database";

/** Nomini o'zgartirish oynasi (bottom-sheet). */
function RenameSheet({
  category,
  onClose,
  onSave,
  saving,
}: {
  category: CategoryWithCount | null;
  onClose: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const colors = useColors();

  const { t } = useTranslation();
  const [name, setName] = useState("");
  // category o'zgarganda inputni boshlang'ich qiymatga to'ldiramiz
  const [seen, setSeen] = useState<string | null>(null);
  if (category && seen !== category.id) {
    setSeen(category.id);
    setName(category.name);
  } else if (!category && seen !== null) {
    setSeen(null);
  }
  const valid = name.trim().length > 0 && name.trim() !== category?.name;

  return (
    <BottomSheet visible={!!category} onClose={onClose} keyboardAvoiding>
            <Text className="mb-3 text-lg font-medium text-ink">{t("category.namePlaceholder")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("category.namePlaceholder")}
              placeholderTextColor={colors.tabInactive}
              className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
              style={{ height: 52 }}
              autoFocus
            />
            <Pressable
              disabled={!valid || saving}
              onPress={() => onSave(name.trim())}
              className="mt-4 flex-row items-center justify-center rounded-2xl bg-primary"
              style={{ height: 54, opacity: valid && !saving ? 1 : 0.5 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-medium text-white">{t("common.save")}</Text>
              )}
            </Pressable>
    </BottomSheet>
  );
}

export default function CategoriesScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const { canManageProducts } = useActivePermissions();
  const { data: categories, isLoading, isError, error, refetch, isRefetching } =
    useCategoriesWithCount();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);

  const createMut = useCreateCategory();
  const renameMut = useRenameCategory();
  const deleteMut = useDeleteCategory();

  function onAdd() {
    const name = newName.trim();
    if (!name) return;
    createMut.mutate(name, {
      onSuccess: () => setNewName(""),
      onError: (e) => toast.error(t("category.addFailed"), (e as Error)?.message ?? t("common.error")),
    });
  }

  function onRename(name: string) {
    if (!editing) return;
    renameMut.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => setEditing(null),
        onError: (e) => toast.error(t("category.renameFailed"), (e as Error)?.message ?? t("common.error")),
      },
    );
  }

  function onDelete(c: CategoryWithCount) {
    const note =
      c.product_count > 0 ? `\n\n${t("category.deleteNote", { count: c.product_count })}` : "";
    Alert.alert(t("category.deleteTitle"), `${t("category.deleteMsg", { name: c.name })}${note}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () =>
          deleteMut.mutate(c.id, {
            onError: (e) => toast.error(t("category.deleteFailed"), (e as Error)?.message ?? t("common.error")),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">{t("category.manageTitle")}</Text>
      </View>

      {!canManageProducts ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">{t("category.gatePerm")}</Text>
        </View>
      ) : (
        <>
          {/* Qo'shish */}
          <View className="px-4">
            <View className="mb-3 flex-row gap-2">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t("category.newPlaceholder")}
                placeholderTextColor={colors.tabInactive}
                className="flex-1 rounded-2xl border border-line bg-surface px-4 text-base text-ink"
                style={{ height: 50 }}
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!newName.trim() || createMut.isPending}
                className="items-center justify-center rounded-2xl bg-primary px-5"
                style={{ height: 50, opacity: newName.trim() && !createMut.isPending ? 1 : 0.5 }}
              >
                {createMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="add" size={24} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                {(error as Error)?.message ?? t("common.loadError")}
              </Text>
            </View>
          ) : (categories ?? []).length === 0 ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="pricetags-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">{t("category.emptyHint")}</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <ListItemCard
                  leading={
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
                      <Ionicons name="pricetag" size={18} color={colors.primary} />
                    </View>
                  }
                  title={item.name}
                  subtitle={t("category.productCount", { count: item.product_count })}
                  trailing={
                    <>
                      <Pressable onPress={() => setEditing(item)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                        <Ionicons name="pencil" size={18} color={colors.muted} />
                      </Pressable>
                      <Pressable onPress={() => onDelete(item)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </>
                  }
                />
              )}
            />
          )}
        </>
      )}

      <RenameSheet
        category={editing}
        onClose={() => setEditing(null)}
        onSave={onRename}
        saving={renameMut.isPending}
      />
    </SafeAreaView>
  );
}

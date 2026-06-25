import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
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
    <Modal visible={!!category} transparent animationType="slide" onRequestClose={onClose}>
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
              paddingBottom: 32,
            }}
          >
            <View
              style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }}
            />
            <Text className="mb-3 text-lg font-medium text-ink">Kategoriya nomi</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Kategoriya nomi"
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
                <Text className="text-base font-medium text-white">Saqlash</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
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
      onError: (e) => Alert.alert("Qo'shilmadi", (e as Error)?.message ?? "Xatolik"),
    });
  }

  function onRename(name: string) {
    if (!editing) return;
    renameMut.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => setEditing(null),
        onError: (e) => Alert.alert("O'zgarmadi", (e as Error)?.message ?? "Xatolik"),
      },
    );
  }

  function onDelete(c: CategoryWithCount) {
    const note =
      c.product_count > 0
        ? `\n\n${c.product_count} ta mahsulot kategoriyasiz qoladi (o'chmaydi).`
        : "";
    Alert.alert("Kategoriyani o'chirish", `"${c.name}" o'chirilsinmi?${note}`, [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () =>
          deleteMut.mutate(c.id, {
            onError: (e) => Alert.alert("O'chmadi", (e as Error)?.message ?? "Xatolik"),
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
        <Text className="text-xl font-semibold text-ink">Kategoriyalar</Text>
      </View>

      {!canManageProducts ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">
            Kategoriyalar faqat egasi yoki "Mahsulotlar" ruxsati bor xodimga ko'rinadi.
          </Text>
        </View>
      ) : (
        <>
          {/* Qo'shish */}
          <View className="px-4">
            <View className="mb-3 flex-row gap-2">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Yangi kategoriya..."
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
                {(error as Error)?.message ?? "Yuklab bo'lmadi"}
              </Text>
            </View>
          ) : (categories ?? []).length === 0 ? (
            <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
              <Ionicons name="pricetags-outline" size={36} color={colors.muted} />
              <Text className="text-center text-sm text-muted">
                Hali kategoriya yo'q. Yuqorida qo'shing.
              </Text>
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
                <View
                  className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-surface p-3"
                  style={{ borderWidth: 0.5, borderColor: colors.line }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
                    <Ionicons name="pricetag" size={18} color={colors.primary} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-medium text-ink" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-xs text-muted">{item.product_count} mahsulot</Text>
                  </View>
                  <Pressable onPress={() => setEditing(item)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                    <Ionicons name="pencil" size={18} color={colors.muted} />
                  </Pressable>
                  <Pressable onPress={() => onDelete(item)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
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

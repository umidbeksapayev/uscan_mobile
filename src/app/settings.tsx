import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useMemberships } from "@/features/auth/use-memberships";
import { PERMISSION_LABELS } from "@/features/auth/permissions";
import { useStaff, useAddMember, useRemoveMember, useSetPermissions } from "@/features/auth/use-staff";
import type { MemberPermissions, ShopMemberRow } from "@/types/database";

/** Kassir ruxsatlari oynasi (6 toggle) + o'chirish. */
function PermissionsSheet({
  member,
  onClose,
  onSave,
  onRemove,
  saving,
}: {
  member: ShopMemberRow | null;
  onClose: () => void;
  onSave: (permissions: MemberPermissions) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const [perms, setPerms] = useState<MemberPermissions>({});
  const [seen, setSeen] = useState<string | null>(null);
  if (member && seen !== member.user_id) {
    setSeen(member.user_id);
    setPerms({ ...member.permissions });
  } else if (!member && seen !== null) {
    setSeen(null);
  }

  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
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
              style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }}
            />
            <Text className="text-lg font-medium text-ink" numberOfLines={1}>
              {member?.email}
            </Text>
            <Text className="mb-3 text-sm text-muted">Kassir ruxsatlari</Text>

            {PERMISSION_LABELS.map((p) => (
              <View key={p.key} className="flex-row items-center gap-3 border-t border-line py-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-base text-ink">{p.label}</Text>
                  <Text className="text-xs text-muted">{p.hint}</Text>
                </View>
                <Switch
                  value={!!perms[p.key]}
                  onValueChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))}
                  trackColor={{ true: colors.primary, false: colors.line }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            <Pressable
              disabled={saving}
              onPress={() => onSave(perms)}
              className="mt-5 flex-row items-center justify-center rounded-2xl bg-primary"
              style={{ height: 54, opacity: saving ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-medium text-white">Saqlash</Text>
              )}
            </Pressable>

            <Pressable
              onPress={onRemove}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl bg-bg"
              style={{ height: 50, borderWidth: 1, borderColor: colors.line }}
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
              <Text className="text-base font-medium text-danger">Xodimni chiqarish</Text>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { data: memberships } = useMemberships();
  const active = memberships?.[0];
  const shopId = active?.shop.id;
  const isOwner = active?.role === "owner";

  const { data: staff, isLoading, isError, error } = useStaff(isOwner ? shopId : undefined);
  const addMut = useAddMember(shopId);
  const removeMut = useRemoveMember(shopId);
  const permsMut = useSetPermissions(shopId);

  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<ShopMemberRow | null>(null);

  function onAdd() {
    const e = email.trim();
    if (!e) return;
    addMut.mutate(e, {
      onSuccess: () => setEmail(""),
      onError: (err) => Alert.alert("Qo'shilmadi", (err as Error)?.message ?? "Foydalanuvchi topilmadi"),
    });
  }

  function onSavePerms(permissions: MemberPermissions) {
    if (!editing) return;
    permsMut.mutate(
      { userId: editing.user_id, permissions },
      {
        onSuccess: () => setEditing(null),
        onError: (err) => Alert.alert("Saqlanmadi", (err as Error)?.message ?? "Xatolik"),
      },
    );
  }

  function onRemove() {
    if (!editing) return;
    const m = editing;
    Alert.alert("Xodimni chiqarish", `"${m.email}" do'kondan chiqarilsinmi?`, [
      { text: "Bekor", style: "cancel" },
      {
        text: "Chiqarish",
        style: "destructive",
        onPress: () =>
          removeMut.mutate(m.user_id, {
            onSuccess: () => setEditing(null),
            onError: (err) => Alert.alert("Chiqmadi", (err as Error)?.message ?? "Xatolik"),
          }),
      },
    ]);
  }

  const cashiers = (staff ?? []).filter((m) => m.role === "cashier");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Sozlamalar</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Do'kon */}
        <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
          DO'KON
        </Text>
        <View className="mb-5 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-deep">
            <Text className="text-base font-medium text-white">
              {(active?.shop.name ?? "u").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-ink">{active?.shop.name ?? "Do'kon"}</Text>
            <Text className="text-sm text-muted">{isOwner ? "Egasi" : "Kassir"}</Text>
          </View>
        </View>

        {!isOwner ? (
          <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
            <Text className="flex-1 text-sm text-muted">
              Xodimlar va ruxsatlarni faqat do'kon egasi boshqaradi.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-2 ml-1 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
              XODIMLAR (KASSIRLAR)
            </Text>

            {/* Email bilan qo'shish */}
            <View className="mb-3 flex-row gap-2">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="kassir@email.com"
                placeholderTextColor={colors.tabInactive}
                className="flex-1 rounded-2xl border border-line bg-surface px-4 text-base text-ink"
                style={{ height: 50 }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!email.trim() || addMut.isPending}
                className="items-center justify-center rounded-2xl bg-primary px-5"
                style={{ height: 50, opacity: email.trim() && !addMut.isPending ? 1 : 0.5 }}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="person-add" size={22} color="#fff" />
                )}
              </Pressable>
            </View>
            <Text className="mb-4 ml-1 text-xs text-muted">
              Kassir oldin ro'yxatdan o'tgan bo'lishi kerak (xuddi shu email bilan).
            </Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : isError ? (
              <Text className="py-6 text-center text-sm text-muted">
                {(error as Error)?.message ?? "Yuklab bo'lmadi"}
              </Text>
            ) : cashiers.length === 0 ? (
              <View className="items-center justify-center py-8" style={{ gap: 8 }}>
                <Ionicons name="people-outline" size={32} color={colors.muted} />
                <Text className="text-center text-sm text-muted">
                  Hali kassir yo'q. Email bilan qo'shing.
                </Text>
              </View>
            ) : (
              <View className="rounded-2xl border border-line bg-surface">
                {cashiers.map((m, i) => (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setEditing(m)}
                    android_ripple={{ color: colors.line }}
                    className={`flex-row items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-tint">
                      <Text className="text-sm font-semibold text-primary">
                        {m.email.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-base text-ink" numberOfLines={1}>{m.email}</Text>
                      <Text className="text-xs text-muted">
                        {Object.values(m.permissions ?? {}).filter(Boolean).length} ta ruxsat
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <PermissionsSheet
        member={editing}
        onClose={() => setEditing(null)}
        onSave={onSavePerms}
        onRemove={onRemove}
        saving={permsMut.isPending}
      />
    </SafeAreaView>
  );
}

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { LANGUAGES, setLanguage, type LangCode } from "@/i18n";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useActiveMembership } from "@/features/auth/use-memberships";
import { PERMISSION_LABELS } from "@/features/auth/permissions";
import { useStaff, useAddMember, useRemoveMember, useSetPermissions } from "@/features/auth/use-staff";
import { TelegramSummaryCard } from "@/features/telegram/telegram-summary-card";
import { LocalReminderCard } from "@/features/notifications/local-reminder-card";
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
    <BottomSheet visible={!!member} onClose={onClose} keyboardAvoiding>
      <View className="pb-2">
        <Text className="text-xl font-bold text-ink" numberOfLines={1}>
          {member?.email}
        </Text>
        <Text className="mt-0.5 text-sm font-medium text-muted">Kassir ruxsatnomalarini boshqarish</Text>

        <View className="mt-4 rounded-[20px] border border-line bg-surface overflow-hidden">
          {PERMISSION_LABELS.map((p, i) => (
            <View
              key={p.key}
              className={`flex-row items-center justify-between gap-4 p-4 ${
                i > 0 ? "border-t border-line/60" : ""
              }`}
            >
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-ink">{p.label}</Text>
                <Text className="text-xs text-muted mt-0.5">{p.hint}</Text>
              </View>
              <Switch
                value={!!perms[p.key]}
                onValueChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))}
                trackColor={{ true: colors.primary, false: colors.line }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        <Pressable
          disabled={saving}
          onPress={() => onSave(perms)}
          className="mt-6 flex-row items-center justify-center rounded-[20px] bg-primary shadow-sm"
          style={{ height: 54, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">Saqlash</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onRemove}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-[20px] bg-danger/10 py-4"
        >
          <Ionicons name="person-remove-outline" size={19} color={colors.danger} />
          <Text className="text-base font-semibold text-danger">Xodimni do'kondan chiqarish</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const active = useActiveMembership();
  const shopId = active?.shop.id;
  const isOwner = active?.role === "owner";
  const { t, i18n } = useTranslation();

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
      onError: (err) => toast.error("Qo'shilmadi", (err as Error)?.message ?? "Foydalanuvchi topilmadi"),
    });
  }

  function onSavePerms(permissions: MemberPermissions) {
    if (!editing) return;
    permsMut.mutate(
      { userId: editing.user_id, permissions },
      {
        onSuccess: () => setEditing(null),
        onError: (err) => toast.error("Saqlanmadi", (err as Error)?.message ?? "Xatolik"),
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
            onError: (err) => toast.error("Chiqmadi", (err as Error)?.message ?? "Xatolik"),
          }),
      },
    ]);
  }

  const cashiers = (staff ?? []).filter((m) => m.role === "cashier");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-surface border border-line"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-bold text-ink">{t("settings.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Do'kon Profili */}
        <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
          DO'KON PROFILI
        </Text>
        <View className="mb-6 flex-row items-center gap-3.5 rounded-[24px] border border-line bg-surface p-4 shadow-2xs">
          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-primary-deep shadow-xs">
            <Text className="text-xl font-bold text-white">
              {(active?.shop.name ?? "u").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-lg font-bold text-ink" numberOfLines={1}>{active?.shop.name ?? "Do'kon"}</Text>
            <Text className="text-xs font-medium text-muted mt-0.5">{isOwner ? t("staff.owner") : t("staff.cashier")}</Text>
          </View>
          <View className="rounded-xl bg-primary-tint px-3 py-1.5">
            <Text className="text-xs font-bold text-primary">Faol</Text>
          </View>
        </View>

        {/* Til Tanlash (Segmented card) */}
        <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
          {t("language.label").toUpperCase()}
        </Text>
        <View className="mb-6 rounded-[22px] border border-line bg-surface p-1.5 shadow-2xs flex-row">
          {LANGUAGES.map((l) => {
            const activeLang = i18n.language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code as LangCode)}
                accessibilityLabel={l.label}
                className="flex-1 items-center justify-center rounded-2xl py-3"
                style={{
                  backgroundColor: activeLang ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: activeLang ? "700" : "500",
                    color: activeLang ? "#fff" : colors.ink,
                  }}
                >
                  {l.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Printer va Qurilmalar */}
        <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
          QURILMALAR
        </Text>
        <Pressable
          onPress={() => router.push("/printer-settings")}
          android_ripple={{ color: colors.line }}
          className="mb-6 flex-row items-center gap-3.5 rounded-[22px] border border-line bg-surface p-4 shadow-2xs"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(168, 85, 247, 0.12)" }}>
            <Ionicons name="print" size={21} color="#9333ea" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">Printer va Cheklar</Text>
            <Text className="text-xs text-muted mt-0.5">Bluetooth, termal printer, test chek</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
        </Pressable>

        {/* Bildirishnomalar */}
        <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
          BILDIRISHNOMALAR VA ESLLATMALAR
        </Text>
        <View className="mb-6" style={{ gap: 12 }}>
          <LocalReminderCard />
          {isOwner && active?.shop ? <TelegramSummaryCard shop={active.shop} /> : null}
        </View>

        {/* Xodimlar */}
        {!isOwner ? (
          <View className="flex-row items-center gap-3 rounded-[22px] border border-line bg-surface p-4 shadow-2xs">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-bg border border-line">
              <Ionicons name="lock-closed" size={19} color={colors.muted} />
            </View>
            <Text className="flex-1 text-sm font-medium text-muted">
              Xodimlar va ularning ruxsatnomalarini faqat do'kon egasi boshqarishi mumkin.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
              KASSIRLAR VA XODIMLAR
            </Text>

            {/* Email bilan qo'shish */}
            <View className="mb-3 flex-row items-center gap-2.5 rounded-[22px] border border-line bg-surface p-2 shadow-2xs">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="kassir@email.com"
                placeholderTextColor={colors.tabInactive}
                className="flex-1 px-3 text-base text-ink"
                style={{ height: 44 }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!email.trim() || addMut.isPending}
                className="items-center justify-center rounded-[18px] bg-primary px-5"
                style={{ height: 44, opacity: email.trim() && !addMut.isPending ? 1 : 0.5 }}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="person-add" size={20} color="#fff" />
                )}
              </Pressable>
            </View>
            <Text className="mb-5 ml-1 text-xs text-muted">
              Yangi kassir qo'shish uchun u avval ilovadan shu email orqali ro'yxatdan o'tgan bo'lishi kerak.
            </Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 28 }} />
            ) : isError ? (
              <View className="rounded-[22px] border border-line bg-surface p-6 items-center">
                <Text className="text-center text-sm font-medium text-danger">
                  {(error as Error)?.message ?? "Kassirlar ro'yxatini yuklab bo'lmadi"}
                </Text>
              </View>
            ) : cashiers.length === 0 ? (
              <View className="rounded-[22px] border border-line bg-surface p-8 items-center justify-center shadow-2xs" style={{ gap: 10 }}>
                <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-bg border border-line">
                  <Ionicons name="people" size={26} color={colors.muted} />
                </View>
                <Text className="text-center text-base font-semibold text-ink">Hali kassirlar yo'q</Text>
                <Text className="text-center text-xs text-muted">
                  Yuqoridagi maydonga kassir emailini yozib "Qo'shish" tugmasini bosing.
                </Text>
              </View>
            ) : (
              <View className="rounded-[22px] border border-line bg-surface overflow-hidden shadow-2xs">
                {cashiers.map((m, i) => (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setEditing(m)}
                    android_ripple={{ color: colors.line }}
                    className={`flex-row items-center gap-3.5 p-4 ${i > 0 ? "border-t border-line/60" : ""}`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint">
                      <Text className="text-base font-bold text-primary">
                        {m.email.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-semibold text-ink" numberOfLines={1}>{m.email}</Text>
                      <Text className="text-xs font-medium text-muted mt-0.5">
                        {Object.values(m.permissions ?? {}).filter(Boolean).length} ta ruxsat berilgan
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

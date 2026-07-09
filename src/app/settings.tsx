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

/** Section sarlavha komponenti — bir xil uslub uchun */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="mb-2 ml-1 text-xs font-bold text-muted"
      style={{ letterSpacing: 0.8, textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

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
        {/* Sheet sarlavhasi */}
        <View className="mb-4 flex-row items-center gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
          >
            <Text className="text-lg font-bold" style={{ color: "#2563eb" }}>
              {(member?.email ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink" numberOfLines={1}>
              {member?.email}
            </Text>
            <Text className="text-xs text-muted mt-0.5">Kassir ruxsatnomalari</Text>
          </View>
        </View>

        {/* Ruxsatlar ro'yxati */}
        <View className="rounded-2xl border border-line bg-surface overflow-hidden">
          {PERMISSION_LABELS.map((p, i) => (
            <View
              key={p.key}
              className={`flex-row items-center gap-3 px-4 py-3.5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-ink">{p.label}</Text>
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
          className="mt-5 flex-row items-center justify-center rounded-2xl bg-primary"
          style={{ height: 52, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Saqlash</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onRemove}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-surface"
          style={{ height: 48 }}
        >
          <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.danger }}>
            Xodimni chiqarish
          </Text>
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
      {/* ── Header ── */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-line bg-bg">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-xl bg-surface border border-line"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-lg font-bold text-ink">{t("settings.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════
            DO'KON PROFILI
        ══════════════════════════════════════ */}
        <SectionLabel>Do'kon</SectionLabel>
        <View className="mb-5 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.primaryDeep }}
          >
            <Text className="text-base font-bold text-white">
              {(active?.shop.name ?? "U").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink" numberOfLines={1}>
              {active?.shop.name ?? "Do'kon"}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {isOwner ? t("staff.owner") : t("staff.cashier")}
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: "rgba(16,185,129,0.12)" }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>● Faol</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════
            TIL TANLASH
        ══════════════════════════════════════ */}
        <SectionLabel>{t("language.label")}</SectionLabel>
        <View className="mb-5 rounded-2xl border border-line bg-surface p-1.5 flex-row">
          {LANGUAGES.map((l) => {
            const isActive = i18n.language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code as LangCode)}
                accessibilityLabel={l.label}
                className="flex-1 items-center justify-center rounded-xl py-2.5"
                style={{ backgroundColor: isActive ? colors.primary : "transparent" }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#fff" : colors.muted,
                  }}
                >
                  {l.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ══════════════════════════════════════
            QURILMALAR
        ══════════════════════════════════════ */}
        <SectionLabel>Qurilmalar</SectionLabel>
        <Pressable
          onPress={() => router.push("/printer-settings")}
          android_ripple={{ color: colors.line }}
          className="mb-5 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
          >
            <Ionicons name="print-outline" size={20} color="#9333ea" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">Printer va Cheklar</Text>
            <Text className="text-xs text-muted mt-0.5">Bluetooth, termal printer, test chek</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
        </Pressable>

        {/* ══════════════════════════════════════
            BILDIRISHNOMALAR
        ══════════════════════════════════════ */}
        <SectionLabel>Bildirishnomalar</SectionLabel>
        <View className="mb-5" style={{ gap: 10 }}>
          <LocalReminderCard />
          {isOwner && active?.shop ? <TelegramSummaryCard shop={active.shop} /> : null}
        </View>

        {/* ══════════════════════════════════════
            KASSIRLAR
        ══════════════════════════════════════ */}
        {!isOwner ? (
          <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <Text className="flex-1 text-xs font-medium text-muted">
              Xodimlarni faqat do'kon egasi boshqaradi.
            </Text>
          </View>
        ) : (
          <>
            <SectionLabel>Kassirlar</SectionLabel>

            {/* Email qo'shish maydoni */}
            <View className="mb-2 flex-row items-center gap-2 rounded-2xl border border-line bg-surface p-2">
              <Ionicons name="mail-outline" size={18} color={colors.muted} style={{ marginLeft: 6 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="kassir@email.com"
                placeholderTextColor={colors.tabInactive}
                className="flex-1 text-sm text-ink"
                style={{ height: 40, paddingHorizontal: 4 }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!email.trim() || addMut.isPending}
                className="items-center justify-center rounded-xl bg-primary px-4"
                style={{ height: 40, opacity: email.trim() && !addMut.isPending ? 1 : 0.45 }}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Qo'shish</Text>
                )}
              </Pressable>
            </View>
            <Text className="mb-4 ml-1 text-xs text-muted">
              Kassir ilovadan shu email bilan ro'yxatdan o'tgan bo'lishi kerak.
            </Text>

            {/* Kassirlar ro'yxati */}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : isError ? (
              <View className="rounded-2xl border border-line bg-surface p-5 items-center">
                <Text className="text-center text-xs font-medium text-danger">
                  {(error as Error)?.message ?? "Yuklab bo'lmadi"}
                </Text>
              </View>
            ) : cashiers.length === 0 ? (
              <View
                className="rounded-2xl border border-line bg-surface items-center justify-center py-8"
                style={{ gap: 8 }}
              >
                <Ionicons name="people-outline" size={28} color={colors.muted} />
                <Text className="text-sm font-semibold text-ink">Hali kassirlar yo'q</Text>
                <Text className="text-xs text-muted text-center px-6">
                  Yuqoriga email kiritib «Qo'shish» tugmasini bosing
                </Text>
              </View>
            ) : (
              <View className="rounded-2xl border border-line bg-surface overflow-hidden">
                {cashiers.map((m, i) => (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setEditing(m)}
                    android_ripple={{ color: colors.line }}
                    className={`flex-row items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.primaryTint }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}
                      >
                        {m.email.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                        {m.email}
                      </Text>
                      <Text className="text-xs text-muted mt-0.5">
                        {Object.values(m.permissions ?? {}).filter(Boolean).length} ta ruxsat
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
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

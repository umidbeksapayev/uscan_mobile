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
  Platform,
} from "react-native";

import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useThemeStore, useColors, type ThemeMode } from "@/theme/theme-store";
import { shadowPanel } from "@/theme/shadows";
import type { AppColors } from "@/theme/colors";
import { LANGUAGES, setLanguage, type LangCode } from "@/i18n";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useActiveMembership } from "@/features/auth/use-memberships";
import { PERMISSION_LABELS } from "@/features/auth/permissions";
import { useStaff, useAddMember, useRemoveMember, useSetPermissions } from "@/features/auth/use-staff";
import { TelegramSummaryCard } from "@/features/telegram/telegram-summary-card";
import { LocalReminderCard } from "@/features/notifications/local-reminder-card";
import { FeedbackSheet } from "@/features/feedback/feedback-sheet";
import type { MemberPermissions, ShopMemberRow } from "@/types/database";

/* ─────────────────────────────────────────────────────────────────────────
   Uslub konstantalari
───────────────────────────────────────────────────────────────────────── */
const RADIUS = 18;

/** Karta soyasi — rang palitradan olinadi (tungi rejimda sof qora). */
function cardShadow(colors: AppColors) {
  return shadowPanel(colors.shadow);
}

/* ─────────────────────────────────────────────────────────────────────────
   SectionLabel — bo'lim sarlavhasi
───────────────────────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        color: colors.muted,
        letterSpacing: 0.9,
        textTransform: "uppercase",
        marginBottom: 8,
        marginLeft: 4,
      }}
    >
      {label}
    </Text>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SettingRow — oddiy qator (chevron bilan)
───────────────────────────────────────────────────────────────────────── */
function SettingRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useColors();

  return (
    <>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1, lineHeight: 16 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} style={{ marginLeft: 10 }} />
      </Pressable>
      {!last && (
        <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 68 }} />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PermissionsSheet — kassir ruxsatlari
───────────────────────────────────────────────────────────────────────── */
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
  const colors = useColors();

  const [perms, setPerms] = useState<MemberPermissions>({});
  const [seen, setSeen] = useState<string | null>(null);
  if (member && seen !== member.user_id) {
    setSeen(member.user_id);
    setPerms({ ...member.permissions });
  } else if (!member && seen !== null) {
    setSeen(null);
  }

  const enabledCount = Object.values(perms).filter(Boolean).length;

  return (
    <BottomSheet visible={!!member} onClose={onClose} keyboardAvoiding>
      <View style={{ paddingBottom: 8 }}>
        {/* Avatar + ism */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: colors.primaryTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary }}>
              {(member?.email ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {member?.email}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              Kassir · {enabledCount} ta ruxsat
            </Text>
          </View>
        </View>

        {/* Ruxsatlar */}
        <View
          style={{
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          {PERMISSION_LABELS.map((p, i) => (
            <View key={p.key}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 16 }} />}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{p.label}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 15 }}>
                    {p.hint}
                  </Text>
                </View>
                <Switch
                  value={!!perms[p.key]}
                  onValueChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))}
                  trackColor={{ true: colors.primary, false: colors.line }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Saqlash tugmasi */}
        <Pressable
          disabled={saving}
          onPress={() => onSave(perms)}
          style={{
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Saqlash</Text>
          )}
        </Pressable>

        {/* Chiqarish tugmasi */}
        <Pressable
          onPress={onRemove}
          style={{
            height: 48,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: "rgba(220,38,38,0.2)",
            backgroundColor: "rgba(220,38,38,0.05)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Ionicons name="person-remove-outline" size={17} color={colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.danger }}>
            Xodimni do'kondan chiqarish
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LanguagePickerSheet — til tanlash oynasi
───────────────────────────────────────────────────────────────────────── */
function LanguagePickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();

  const { i18n } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["35%"]}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>
        Interfeys tili
      </Text>
      <View style={{ gap: 8 }}>
        {LANGUAGES.map((l) => {
          const isActive = i18n.language === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => {
                setLanguage(l.code as LangCode);
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: isActive ? colors.primaryTint : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.line,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? colors.primary : colors.ink,
                }}
              >
                {l.label}
              </Text>
              {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ThemePickerSheet — tungi/yorqin rejim tanlash oynasi
───────────────────────────────────────────────────────────────────────── */
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "system", label: "Tizim rejimi (Avto)", icon: "phone-portrait-outline" },
  { mode: "light", label: "Yorqin rejim (Kun)", icon: "sunny-outline" },
  { mode: "dark", label: "Tungi rejim (Tun)", icon: "moon-outline" },
];

function ThemePickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const mode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const colors = useColors();

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["42%"]}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>
        Interfeys mavzusi (Dizayn)
      </Text>
      <View style={{ gap: 8 }}>
        {THEME_OPTIONS.map((opt) => {
          const isActive = mode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => {
                setThemeMode(opt.mode);
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: isActive ? colors.primaryTint : colors.bg,
                borderWidth: 1.5,
                borderColor: isActive ? colors.primary : colors.line,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons name={opt.icon} size={20} color={isActive ? colors.primary : colors.muted} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? colors.primary : colors.ink,
                  }}
                >
                  {opt.label}
                </Text>
              </View>
              {isActive ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SettingsScreen — bosh ekran
───────────────────────────────────────────────────────────────────────── */
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

  const colors = useColors();
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<ShopMemberRow | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const themeMode = useThemeStore((s) => s.themeMode);
  const themeModeLabel =
    themeMode === "dark"
      ? "Tungi rejim (Tun)"
      : themeMode === "light"
        ? "Yorqin rejim (Kun)"
        : "Tizim rejimi (Avto)";

  function onAdd() {
    const e = email.trim();
    if (!e) return;
    addMut.mutate(e, {
      onSuccess: () => setEmail(""),
      onError: (err) =>
        toast.error("Qo'shilmadi", (err as Error)?.message ?? "Foydalanuvchi topilmadi"),
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
  const initials = (active?.shop.name ?? "U").slice(0, 2).toUpperCase();
  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "O'zbekcha";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>

      {/* ── Header ─────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Orqaga")}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: pressed ? colors.bg : colors.bg,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>
          Sozlamalar
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ══════════════════════════════════════════════
            DO'KON PROFILI
        ══════════════════════════════════════════════ */}
        <SectionLabel label="Profil" />
        <View
          style={{
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            marginBottom: 20,
            ...cardShadow(colors),
          }}
        >
          {/* Avatar — gradient simulyatsiya: to'q fon + kichik ring */}
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: colors.primaryDeep,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
                {initials}
              </Text>
            </View>
            {/* Yashil online nuqta */}
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#16A34A",
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.ink, lineHeight: 21 }}
              numberOfLines={1}
            >
              {active?.shop.name ?? "Do'kon"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {isOwner ? t("staff.owner") : t("staff.cashier")}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════
            UMUMIY SOZLAMALAR
        ══════════════════════════════════════════════ */}
        <SectionLabel label="Umumiy" />
        <View
          style={{
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            overflow: "hidden",
            marginBottom: 20,
            ...cardShadow(colors),
          }}
        >
          <SettingRow
            icon="language-outline"
            iconBg="rgba(47,128,237,0.12)"
            iconColor={colors.primary}
            title="Interfeys tili"
            subtitle={currentLangLabel}
            onPress={() => setLangOpen(true)}
          />
          <SettingRow
            icon="color-palette-outline"
            iconBg="rgba(245,158,11,0.12)"
            iconColor="#f59e0b"
            title="Mavzu (Dizayn)"
            subtitle={themeModeLabel}
            onPress={() => setThemeOpen(true)}
          />
          <SettingRow
            icon="print-outline"
            iconBg="rgba(168,85,247,0.12)"
            iconColor="#9333ea"
            title="Printer va Cheklar"
            subtitle="Bluetooth, termal printer, test chek"
            onPress={() => router.push("/printer-settings")}
          />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            iconBg="rgba(16,185,129,0.12)"
            iconColor="#10b981"
            title={t("settings.feedbackTitle", "Fikr-mulohaza")}
            subtitle={t("settings.feedbackHint", "Taklif, shikoyat yoki xato? Bizga yozing.")}
            onPress={() => setFeedbackOpen(true)}
          />
          <SettingRow
            icon="pulse-outline"
            iconBg="rgba(100,116,139,0.12)"
            iconColor={colors.muted}
            title={t("diagnostics.title", "Diagnostika")}
            subtitle={t("diagnostics.settingsSubtitle", "Xatolik jurnali")}
            onPress={() => router.push("/diagnostics")}
            last
          />
        </View>

        {/* ══════════════════════════════════════════════
            BILDIRISHNOMALAR
        ══════════════════════════════════════════════ */}
        <SectionLabel label="Bildirishnomalar" />
        <View style={{ gap: 10, marginBottom: 20 }}>
          <LocalReminderCard />
          {isOwner && active?.shop ? <TelegramSummaryCard shop={active.shop} /> : null}
        </View>

        {/* ══════════════════════════════════════════════
            KASSIRLAR
        ══════════════════════════════════════════════ */}
        {!isOwner ? (
          <View
            style={{
              borderRadius: RADIUS,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 16,
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              Kassirlar va ruxsatlarni faqat do'kon egasi boshqaradi.
            </Text>
          </View>
        ) : (
          <>
            <SectionLabel label="Kassirlar" />

            {/* Email qo'shish — kompakt inline karta */}
            <View
              style={{
                borderRadius: RADIUS,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingLeft: 14,
                paddingRight: 6,
                paddingVertical: 6,
                marginBottom: 6,
                ...cardShadow(colors),
              }}
            >
              <Ionicons name="mail-outline" size={17} color={colors.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="kassir@email.com"
                placeholderTextColor={colors.tabInactive}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: colors.ink,
                  height: 42,
                  paddingVertical: 0,
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!email.trim() || addMut.isPending}
                style={{
                  paddingHorizontal: 16,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: email.trim() && !addMut.isPending ? 1 : 0.45,
                }}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                    Qo'shish
                  </Text>
                )}
              </Pressable>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.muted,
                marginBottom: 16,
                marginLeft: 4,
                lineHeight: 15,
              }}
            >
              Kassir ilovadan shu email bilan ro'yxatdan o'tgan bo'lishi kerak.
            </Text>

            {/* Kassirlar ro'yxati */}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 28 }} />
            ) : isError ? (
              <View
                style={{
                  borderRadius: RADIUS,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, color: colors.danger, textAlign: "center" }}>
                  {(error as Error)?.message ?? "Yuklab bo'lmadi"}
                </Text>
              </View>
            ) : cashiers.length === 0 ? (
              <View
                style={{
                  borderRadius: RADIUS,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  padding: 32,
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.line,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="people-outline" size={26} color={colors.muted} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>
                  Hali kassirlar yo'q
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    textAlign: "center",
                    lineHeight: 17,
                  }}
                >
                  Yuqoriga email kiritib «Qo'shish» tugmasini bosing
                </Text>
              </View>
            ) : (
              <View
                style={{
                  borderRadius: RADIUS,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  overflow: "hidden",
                  ...cardShadow(colors),
                }}
              >
                {cashiers.map((m, i) => {
                  const permCount = Object.values(m.permissions ?? {}).filter(Boolean).length;
                  return (
                    <View key={m.user_id}>
                      {i > 0 && (
                        <View
                          style={{ height: 1, backgroundColor: colors.line, marginLeft: 70 }}
                        />
                      )}
                      <Pressable
                        onPress={() => setEditing(m)}
                        android_ripple={{ color: colors.line }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 14,
                          paddingHorizontal: 16,
                          paddingVertical: 13,
                          // iOS bosilish holati — palitradan, aks holda tungi
                          // rejimda oq chaqnash bo'lardi
                          backgroundColor:
                            pressed && Platform.OS === "ios" ? colors.bg : colors.surface,
                        })}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: colors.primaryTint,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{ fontSize: 16, fontWeight: "800", color: colors.primary }}
                          >
                            {m.email.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}
                            numberOfLines={1}
                          >
                            {m.email}
                          </Text>
                          <Text
                            style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}
                          >
                            {permCount > 0
                              ? `${permCount} ta ruxsat berilgan`
                              : "Ruxsatlar berilmagan"}
                          </Text>
                        </View>
                        {/* Ruxsat soni badge */}
                        <View
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            borderRadius: 20,
                            backgroundColor:
                              permCount > 0 ? colors.primaryTint : colors.bg,
                            borderWidth: 1,
                            borderColor:
                              permCount > 0
                                ? "rgba(47,128,237,0.2)"
                                : colors.line,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: permCount > 0 ? colors.primary : colors.muted,
                            }}
                          >
                            {permCount}/6
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={colors.tabInactive}
                        />
                      </Pressable>
                    </View>
                  );
                })}
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
      <LanguagePickerSheet
        visible={langOpen}
        onClose={() => setLangOpen(false)}
      />
      <ThemePickerSheet
        visible={themeOpen}
        onClose={() => setThemeOpen(false)}
      />
      <FeedbackSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </SafeAreaView>
  );
}

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
import { LinearGradient } from "expo-linear-gradient";

import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useThemeStore, useColors, type ThemeMode } from "@/theme/theme-store";
import { shadowGlow } from "@/theme/shadows";
import { LANGUAGES, setLanguage, type LangCode } from "@/i18n";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { useActiveMembership } from "@/features/auth/use-memberships";
import { PERMISSION_LABELS } from "@/features/auth/permissions";
import { useStaff, useAddMember, useRemoveMember, useSetPermissions } from "@/features/auth/use-staff";
import { LocalReminderCard } from "@/features/notifications/local-reminder-card";
import { DailySummaryCard } from "@/features/notifications/daily-summary-card";
import { FeedbackSheet } from "@/features/feedback/feedback-sheet";
import type { MemberPermissions, ShopMemberRow } from "@/types/database";
import { radius, text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";

/* ─────────────────────────────────────────────────────────────────────────
   SectionLabel — bo'lim sarlavhasi
   Brend ko'kida: ekranni bo'limlarga ajratadi va "moviy" ohangni ushlab turadi.
───────────────────────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginLeft: 4 }}>
      <View style={{ width: 3, height: 13, borderRadius: radius.full, backgroundColor: colors.primary }} />
      <Text
        accessibilityRole="header"
        style={{
          fontSize: text.xs,
          fontWeight: "700",
          color: colors.heading,
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SettingRow — sozlama qatori (chevron bilan)

   Ikonka chiplari ATAYIN bitta rangda (brend ko'ki): ilgari har qatorda
   boshqa rang bor edi (binafsha/sariq/yashil) — bu ranglar hech qanday
   ma'no bermasdi, faqat ekranni rang-barang qilardi va tungi rejimda
   tekshirilmagan qattiq HEX qiymatlar edi. Qatorlarni ikonka SHAKLI
   ajratadi, rang esa brendni ushlab turadi.
───────────────────────────────────────────────────────────────────────── */
function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
  muted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
  /** Ikkilamchi qator (Diagnostika) — brend ko'ki emas, neytral. */
  muted?: boolean;
}) {
  const colors = useColors();
  const [pressed, setPressed] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        android_ripple={{ color: colors.line }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          // 38px chip + 2×14px = 66px balandlik — a11y minimumidan (44px) yuqori
          paddingVertical: 14,
          backgroundColor: pressed ? colors.bg : colors.surface,
        }}
      >
        <View style={{ marginRight: 14 }}>
          <IconChip icon={icon} tone={muted ? "neutral" : "brand"} />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: text.base, fontWeight: "600", color: colors.ink, lineHeight: 20 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 1, lineHeight: 16 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} style={{ marginLeft: 10 }} />
      </Pressable>
      {!last && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 68 }} />}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ChoiceRow — tanlov qatori (til / mavzu oynalarida)
   Tanlangan holat: brend ko'ki fon + chegara + belgi. Faqat rang emas,
   BELGI (checkmark) ham beriladi — rang ko'rmaydigan foydalanuvchi uchun.
───────────────────────────────────────────────────────────────────────── */
function ChoiceRow({
  label,
  hint,
  icon,
  active,
  onPress,
}: {
  label: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: radius.lg,
        backgroundColor: active ? colors.primaryTint : colors.surface,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.line,
      }}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={active ? colors.primary : colors.muted} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: text.base,
            fontWeight: active ? "700" : "500",
            color: active ? colors.primary : colors.ink,
          }}
        >
          {label}
        </Text>
        {hint ? (
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      <Ionicons
        name={active ? "checkmark-circle" : "ellipse-outline"}
        size={21}
        color={active ? colors.primary : colors.tabInactive}
      />
    </Pressable>
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
  const { t } = useTranslation();

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.lg,
              backgroundColor: colors.primaryTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: text.xl, fontWeight: "800", color: colors.primary }}>
              {(member?.email ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: text.base, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {member?.email}
            </Text>
            <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
              {t("settings.permCountShort", { count: enabledCount })}
            </Text>
          </View>
        </View>

        {/* Ruxsatlar */}
        <Card padded={false} style={{ overflow: "hidden", marginBottom: 14 }}>
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
                  <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }}>
                    {t(`staff.perm_${p.key}`, p.label)}
                  </Text>
                  <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2, lineHeight: 15 }}>
                    {t(`staff.permHint_${p.key}`, p.hint)}
                  </Text>
                </View>
                <Switch
                  value={!!perms[p.key]}
                  onValueChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))}
                  accessibilityLabel={t(`staff.perm_${p.key}`, p.label)}
                  trackColor={{ true: colors.primary, false: colors.line }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Saqlash tugmasi */}
        <Pressable
          disabled={saving}
          onPress={() => onSave(perms)}
          accessibilityRole="button"
          accessibilityLabel={t("common.save")}
          accessibilityState={{ disabled: saving }}
          style={{
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
            opacity: saving ? 0.6 : 1,
            ...shadowGlow(colors.primary),
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: text.base, fontWeight: "700", color: "#fff" }}>{t("common.save")}</Text>
          )}
        </Pressable>

        {/* Chiqarish tugmasi */}
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t("settings.removeStaffBtn")}
          style={{
            height: 48,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.dangerBorder,
            backgroundColor: colors.dangerTint,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Ionicons name="person-remove-outline" size={17} color={colors.dangerInk} />
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.dangerInk }}>
            {t("settings.removeStaffBtn")}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LanguagePickerSheet — til tanlash oynasi
───────────────────────────────────────────────────────────────────────── */
function LanguagePickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["38%"]}>
      <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>
        {t("settings.rowLanguage")}
      </Text>
      <View style={{ gap: 8 }}>
        {LANGUAGES.map((l) => (
          <ChoiceRow
            key={l.code}
            label={l.label}
            active={i18n.language === l.code}
            onPress={() => {
              setLanguage(l.code as LangCode);
              onClose();
            }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ThemePickerSheet — tungi/yorqin rejim tanlash oynasi
───────────────────────────────────────────────────────────────────────── */
const THEME_OPTIONS: {
  mode: ThemeMode;
  labelKey: string;
  hintKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: "system", labelKey: "settings.themeSystem", hintKey: "settings.themeSystemHint", icon: "phone-portrait-outline" },
  { mode: "light", labelKey: "settings.themeLight", hintKey: "settings.themeLightHint", icon: "sunny-outline" },
  { mode: "dark", labelKey: "settings.themeDark", hintKey: "settings.themeDarkHint", icon: "moon-outline" },
];

function ThemePickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const mode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["48%"]}>
      <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>
        {t("settings.rowTheme")}
      </Text>
      <View style={{ gap: 8 }}>
        {THEME_OPTIONS.map((opt) => (
          <ChoiceRow
            key={opt.mode}
            icon={opt.icon}
            label={t(opt.labelKey)}
            hint={t(opt.hintKey)}
            active={mode === opt.mode}
            onPress={() => {
              setThemeMode(opt.mode);
              onClose();
            }}
          />
        ))}
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
      ? t("settings.themeDark")
      : themeMode === "light"
        ? t("settings.themeLight")
        : t("settings.themeSystem");

  function onAdd() {
    const e = email.trim();
    if (!e) return;
    addMut.mutate(e, {
      onSuccess: () => setEmail(""),
      onError: (err) =>
        toast.error(t("staff.addError"), (err as Error)?.message ?? t("common.unknownError")),
    });
  }

  function onSavePerms(permissions: MemberPermissions) {
    if (!editing) return;
    permsMut.mutate(
      { userId: editing.user_id, permissions },
      {
        onSuccess: () => setEditing(null),
        onError: (err) =>
          toast.error(t("common.saveFailed"), (err as Error)?.message ?? t("common.unknownError")),
      },
    );
  }

  function onRemove() {
    if (!editing) return;
    const m = editing;
    Alert.alert(t("settings.removeStaffTitle"), t("staff.removeConfirm", { name: m.email }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("staff.removeBtn"),
        style: "destructive",
        onPress: () =>
          removeMut.mutate(m.user_id, {
            onSuccess: () => setEditing(null),
            onError: (err) =>
              toast.error(t("staff.removeError"), (err as Error)?.message ?? t("common.unknownError")),
          }),
      },
    ]);
  }

  const cashiers = (staff ?? []).filter((m) => m.role === "cashier");
  const initials = (active?.shop.name ?? "U").slice(0, 2).toUpperCase();
  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? LANGUAGES[0].label;
  const canAdd = !!email.trim() && !addMut.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title={t("settings.title")} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════
            DO'KON PROFILI — brend ko'ki gradient karta
            (Bosh sahifadagi statistika kartalari bilan bir tilda)
        ══════════════════════════════════════════════ */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.xl,
            padding: 18,
            marginBottom: 22,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            ...shadowGlow(colors.primary),
          }}
        >
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: radius.lg,
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.28)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: text.xl, fontWeight: "800", color: "#fff" }}>{initials}</Text>
            </View>
            {/* Faol do'kon belgisi */}
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: radius.full,
                backgroundColor: colors.success,
                borderWidth: 2,
                borderColor: colors.primaryDeep,
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: text.lg, fontWeight: "800", color: "#fff", lineHeight: 22 }}
              numberOfLines={1}
            >
              {active?.shop.name ?? t("common.appName")}
            </Text>
            {/* Rol nishoni — "kim sifatida kirganman" savoliga darhol javob */}
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: radius.full,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Ionicons
                name={isOwner ? "shield-checkmark" : "person"}
                size={12}
                color="#fff"
              />
              <Text style={{ fontSize: text.xs, fontWeight: "600", color: "#fff" }}>
                {isOwner ? t("staff.owner") : t("staff.cashier")}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════
            UMUMIY SOZLAMALAR
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("settings.sectionGeneral")} />
        <Card padded={false} elevated style={{ overflow: "hidden", marginBottom: 22 }}>
          <SettingRow
            icon="language-outline"
            title={t("settings.rowLanguage")}
            subtitle={currentLangLabel}
            onPress={() => setLangOpen(true)}
          />
          <SettingRow
            icon="color-palette-outline"
            title={t("settings.rowTheme")}
            subtitle={themeModeLabel}
            onPress={() => setThemeOpen(true)}
          />
          <SettingRow
            icon="print-outline"
            title={t("settings.rowPrinter")}
            subtitle={t("settings.rowPrinterSub")}
            onPress={() => router.push("/printer-settings")}
          />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            title={t("settings.feedbackTitle")}
            subtitle={t("settings.feedbackHint")}
            onPress={() => setFeedbackOpen(true)}
          />
          <SettingRow
            icon="pulse-outline"
            title={t("diagnostics.title")}
            subtitle={t("diagnostics.settingsSubtitle")}
            onPress={() => router.push("/diagnostics")}
            muted
            last
          />
        </Card>

        {/* ══════════════════════════════════════════════
            BILDIRISHNOMALAR
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("settings.sectionNotifications")} />
        {/*
          Ega: xulosa vaqti va yetkazish kanallari (push + Telegram) BITTA
          kartada. Ilgari uchta karta va ikkita alohida vaqt tanlagich bor edi.

          Kassir: server xulosasi unga umuman yuborilmaydi
          (`get_push_summaries` faqat `sh.owner_id` tokenlariga yuboradi),
          shuning uchun unga faqat telefondagi lokal eslatma ko'rsatiladi.
        */}
        <View style={{ gap: 10, marginBottom: 22 }}>
          {isOwner && active?.shop ? <DailySummaryCard shop={active.shop} /> : null}
          <LocalReminderCard />
        </View>

        {/* ══════════════════════════════════════════════
            KASSIRLAR
        ══════════════════════════════════════════════ */}
        {!isOwner ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <Text style={{ flex: 1, fontSize: text.sm, color: colors.muted, lineHeight: 18 }}>
              {t("settings.cashierOnlyOwner")}
            </Text>
          </Card>
        ) : (
          <>
            <SectionLabel label={t("settings.sectionCashiers")} />

            {/* Email qo'shish — kompakt inline karta */}
            <Card
              padded={false}
              elevated
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingLeft: 14,
                paddingRight: 6,
                paddingVertical: 6,
                marginBottom: 6,
              }}
            >
              <Ionicons name="mail-outline" size={17} color={colors.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("settings.staffEmailPlaceholder")}
                placeholderTextColor={colors.tabInactive}
                accessibilityLabel={t("staff.addTitle")}
                style={{
                  flex: 1,
                  fontSize: text.sm,
                  color: colors.ink,
                  height: 42,
                  paddingVertical: 0,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <Pressable
                onPress={onAdd}
                disabled={!canAdd}
                accessibilityRole="button"
                accessibilityLabel={t("staff.addBtn")}
                accessibilityState={{ disabled: !canAdd }}
                style={{
                  paddingHorizontal: 16,
                  height: 38,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: canAdd ? 1 : 0.45,
                }}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: text.sm, fontWeight: "700", color: "#fff" }}>
                    {t("staff.addBtn")}
                  </Text>
                )}
              </Pressable>
            </Card>
            <Text
              style={{
                fontSize: text.xs,
                color: colors.muted,
                marginBottom: 16,
                marginLeft: 4,
                lineHeight: 15,
              }}
            >
              {t("settings.staffEmailHint")}
            </Text>

            {/* Kassirlar ro'yxati */}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 28 }} />
            ) : isError ? (
              <Card tone="danger" style={{ alignItems: "center" }}>
                <Text style={{ fontSize: text.sm, color: colors.dangerInk, textAlign: "center" }}>
                  {(error as Error)?.message ?? t("common.loadError")}
                </Text>
              </Card>
            ) : cashiers.length === 0 ? (
              <Card style={{ padding: 32, alignItems: "center", gap: 10 }}>
                <IconChip icon="people-outline" size="lg" />
                <Text style={{ fontSize: text.base, fontWeight: "600", color: colors.ink }}>
                  {t("staff.noCashiers")}
                </Text>
                <Text
                  style={{
                    fontSize: text.xs,
                    color: colors.muted,
                    textAlign: "center",
                    lineHeight: 17,
                  }}
                >
                  {t("settings.noCashiersHint")}
                </Text>
              </Card>
            ) : (
              <Card padded={false} elevated style={{ overflow: "hidden" }}>
                {cashiers.map((m, i) => (
                  <CashierRow
                    key={m.user_id}
                    member={m}
                    first={i === 0}
                    onPress={() => setEditing(m)}
                  />
                ))}
              </Card>
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
      <LanguagePickerSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <ThemePickerSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CashierRow — kassir qatori (ruxsat soni nishoni bilan)
───────────────────────────────────────────────────────────────────────── */
function CashierRow({
  member,
  first,
  onPress,
}: {
  member: ShopMemberRow;
  first: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);

  const permCount = Object.values(member.permissions ?? {}).filter(Boolean).length;
  const total = PERMISSION_LABELS.length;
  const hasPerms = permCount > 0;

  return (
    <>
      {!first && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 70 }} />}
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        android_ripple={{ color: colors.line }}
        accessibilityRole="button"
        accessibilityLabel={`${member.email}, ${
          hasPerms ? t("settings.permGranted", { count: permCount }) : t("settings.permNone")
        }`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 13,
          backgroundColor: pressed ? colors.bg : colors.surface,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.primaryTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: text.base, fontWeight: "800", color: colors.primary }}>
            {member.email.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
            {member.email}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
            {hasPerms ? t("settings.permGranted", { count: permCount }) : t("settings.permNone")}
          </Text>
        </View>
        {/* Ruxsat soni nishoni — ruxsat yo'q bo'lsa neytral, bor bo'lsa brend ko'ki */}
        <Badge label={`${permCount}/${total}`} tone={hasPerms ? "brand" : "neutral"} numeric />
        <Ionicons name="chevron-forward" size={15} color={colors.tabInactive} />
      </Pressable>
    </>
  );
}

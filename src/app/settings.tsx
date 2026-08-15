import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { meta, MetaKeys } from "@/lib/offline/mmkv";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useThemeStore, useColors, type ThemeMode } from "@/theme/theme-store";
import { shadowGlow } from "@/theme/shadows";
import { LANGUAGES, setLanguage, type LangCode } from "@/i18n";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { SettingRow } from "@/components/ui/setting-row";
import { useActiveMembership, useActivePermissions } from "@/features/auth/use-memberships";
import { LocalReminderCard } from "@/features/notifications/local-reminder-card";
import { DailySummaryCard } from "@/features/notifications/daily-summary-card";
import { FeedbackSheet } from "@/features/feedback/feedback-sheet";
import { radius, text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";

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
  const { isOwner } = useActivePermissions();
  const { t, i18n } = useTranslation();

  const colors = useColors();
  // AI yozuv ruxsati — default YOQILGAN. Haqiqiy himoya tasdiq kartasi;
  // bu tugma "o'chirish" uchun (mmkv.ts dagi izohga qarang).
  const [aiWrites, setAiWrites] = useState(() => meta.getBoolOr(MetaKeys.aiWrites, true));
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

  const initials = (active?.shop.name ?? "U").slice(0, 2).toUpperCase();
  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? LANGUAGES[0].label;

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
            AI YORDAMCHI — faqat egasi
        ══════════════════════════════════════════════ */}
        {isOwner ? (
          <>
            <SectionLabel label={t("ai.title")} />
            <Card style={{ marginBottom: 22, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }}>
                    {t("ai.writesTitle")}
                  </Text>
                  <Text
                    style={{ fontSize: text.xs, color: colors.muted, marginTop: 2, lineHeight: 16 }}
                  >
                    {t("ai.writesHint")}
                  </Text>
                </View>
                <Switch
                  value={aiWrites}
                  onValueChange={(v) => {
                    meta.setBool(MetaKeys.aiWrites, v);
                    setAiWrites(v);
                  }}
                  accessibilityLabel={t("ai.writesTitle")}
                  trackColor={{ true: colors.primary, false: colors.line }}
                  thumbColor="#fff"
                />
              </View>
            </Card>
          </>
        ) : null}

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

      </ScrollView>

      <LanguagePickerSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <ThemePickerSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </SafeAreaView>
  );
}

import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";

import { meta, MetaKeys } from "@/lib/offline/mmkv";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useThemeStore, useColors, type ThemeMode } from "@/theme/theme-store";
import { LANGUAGES, setLanguage, type LangCode } from "@/i18n";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { SettingRow } from "@/components/ui/setting-row";
import { useActiveMembership, useActivePermissions } from "@/features/auth/use-memberships";
import { NotificationsSheet } from "@/features/notifications/notifications-sheet";
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const themeMode = useThemeStore((s) => s.themeMode);
  const themeModeLabel =
    themeMode === "dark"
      ? t("settings.themeDark")
      : themeMode === "light"
        ? t("settings.themeLight")
        : t("settings.themeSystem");

  const currentLangLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label ?? LANGUAGES[0].label;

  function toggleAiWrites(value: boolean) {
    meta.setBool(MetaKeys.aiWrites, value);
    setAiWrites(value);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title={t("settings.title")} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/*
          Do'kon nomi + rol kartasi ATAYLAB olib tashlandi: aynan shu
          ma'lumot "Ko'proq" tabining tepasida turadi (u yerda bosilganda
          do'kon almashtirish oynasi ochiladi, ya'ni foydali). Sozlamalarda
          esa u faqat rangli sirt edi — hech qayerga olib bormasdi.
        */}

        {/* ══════════════════════════════════════════════
            UMUMIY
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("settings.sectionGeneral")} />
        <Card padded={false} style={{ overflow: "hidden", marginBottom: 24 }}>
          <SettingRow
            icon="language-outline"
            title={t("settings.rowLanguage")}
            subtitle={currentLangLabel}
            onPress={() => setLangOpen(true)}
          />
          <SettingRow
            icon="moon-outline"
            title={t("settings.rowTheme")}
            subtitle={themeModeLabel}
            onPress={() => setThemeOpen(true)}
          />
          {/* Bildirishnomalar — ilgari ikkita katta karta ekran tanasida
              turardi. Endi qator, tafsilot esa oynada. */}
          <SettingRow
            icon="notifications-outline"
            title={t("settings.sectionNotifications")}
            subtitle={t("settings.rowNotificationsSub")}
            onPress={() => setNotifOpen(true)}
          />
          <SettingRow
            icon="print-outline"
            title={t("settings.rowPrinter")}
            subtitle={t("settings.rowPrinterSub")}
            onPress={() => router.push("/printer-settings")}
            last
          />
        </Card>

        {/* ══════════════════════════════════════════════
            AI YORDAMCHI — faqat egasi
        ══════════════════════════════════════════════ */}
        {isOwner ? (
          <>
            <SectionLabel label={t("ai.title")} />
            <Card padded={false} style={{ overflow: "hidden", marginBottom: 24 }}>
              {/* Butun qator bosiladi — ilgari faqat kichkina switch'ning
                  o'ziga tegish kerak edi. */}
              <SettingRow
                icon="sparkles-outline"
                title={t("ai.writesTitle")}
                subtitle={t("ai.writesHint")}
                onPress={() => toggleAiWrites(!aiWrites)}
                right={
                  <Switch
                    value={aiWrites}
                    onValueChange={toggleAiWrites}
                    accessibilityLabel={t("ai.writesTitle")}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor="#fff"
                  />
                }
                last
              />
            </Card>
          </>
        ) : null}

        {/* ══════════════════════════════════════════════
            YORDAM
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("settings.sectionHelp")} />
        <Card padded={false} style={{ overflow: "hidden" }}>
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
      </ScrollView>

      <LanguagePickerSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <ThemePickerSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <NotificationsSheet
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        shop={active?.shop}
        isOwner={isOwner}
      />
      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </SafeAreaView>
  );
}

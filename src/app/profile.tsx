import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { pickAndCompress, type ImageSource } from "@/lib/pick-image";
import { uploadAvatar, deleteAvatar } from "@/lib/storage";
import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";
import { shadowGlow } from "@/theme/shadows";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { SettingRow } from "@/components/ui/setting-row";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-context";
import { useActiveMembership, useActivePermissions } from "@/features/auth/use-memberships";
import { unregisterPushToken } from "@/features/notifications/notify";
import { useProfile, useUpdateProfile } from "@/features/profile/use-profile";
import { displayName, initials } from "@/features/profile/display-name";
import { ChangePasswordSheet } from "@/features/profile/change-password-sheet";

/** Parolni tiklash havolasi shu yerga tushadi — `(auth)/forgot-password.tsx`
 *  bilan bir xil (Supabase Redirect URLs'da ro'yxatdan o'tgan). */
const REDIRECT_TO = "uscan://reset-password";

/* ─────────────────────────────────────────────────────────────────────────
   NameEditor — ism maydoni

   Boshlang'ich qiymat `key` orqali beriladi (profil yuklangach komponent
   qaytadan yaratiladi). Effekt bilan `setState` qilish shart emas —
   `react-hooks/set-state-in-effect` ogohlantirishi ham chiqmaydi.
───────────────────────────────────────────────────────────────────────── */
function NameEditor({ initial, email }: { initial: string; email: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const [value, setValue] = useState(initial);

  const dirty = value.trim() !== initial.trim();

  async function onSave() {
    try {
      await updateProfile.mutateAsync({ fullName: value.trim() });
      toast.success(t("profile.saved"), t("profile.savedHint"));
    } catch (e) {
      logError("profile.updateName", e);
      toast.error(t("common.error"), e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Field
        label={t("profile.nameLabel")}
        value={value}
        onChangeText={setValue}
        placeholder={t("profile.namePlaceholder")}
        maxLength={80}
        autoCapitalize="words"
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: text.sm, fontWeight: "500", color: colors.ink }}>
          {t("auth.email")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: 52,
            paddingHorizontal: 14,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.bg,
          }}
        >
          <Ionicons name="mail-outline" size={18} color={colors.muted} />
          <Text style={{ flex: 1, fontSize: text.base, color: colors.muted }} numberOfLines={1}>
            {email}
          </Text>
        </View>
        {/* Email o'zgartirilmaydi: yangi manzil tasdiqlanmasa foydalanuvchi
            hisobidan ayrilishi mumkin. Kerak bo'lsa qo'llab-quvvatlash
            orqali — bu ataylab qilingan qaror. */}
        <Text style={{ fontSize: text.xs, color: colors.muted, lineHeight: 16 }}>
          {t("profile.emailReadonly")}
        </Text>
      </View>

      {dirty ? (
        <Button label={t("common.save")} onPress={onSave} loading={updateProfile.isPending} />
      ) : null}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ProfileScreen
───────────────────────────────────────────────────────────────────────── */
export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const active = useActiveMembership();
  const { isOwner } = useActivePermissions();

  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const user = session?.user;
  const email = user?.email ?? "";
  const name = displayName(profile, email, t("profile.fallbackName"));
  const avatarUrl = profile?.avatar_url ?? null;

  // Kirish usuli: parol bormi yoki faqat Google'mi. `identities` sessiyada
  // keladi — qo'shimcha tarmoq so'rovi shart emas.
  const providers = (user?.identities ?? []).map((i) => i.provider);
  const hasPassword = providers.includes("email");
  const hasGoogle = providers.includes("google");
  const providerLabel = hasGoogle
    ? hasPassword
      ? t("profile.providerBoth")
      : "Google"
    : t("profile.providerEmail");

  async function pickPhoto(source: ImageSource) {
    if (!user) return;
    setPhotoOpen(false);
    setUploading(true);
    try {
      const base64 = await pickAndCompress(source);
      if (!base64) return;
      const url = await uploadAvatar(base64, user.id);
      await updateProfile.mutateAsync({ avatarUrl: url });
      // Eskisini fon rejimida o'chiramiz — natijasi foydalanuvchiga ta'sir
      // qilmaydi, shuning uchun kutilmaydi.
      if (avatarUrl) void deleteAvatar(avatarUrl);
      toast.success(t("profile.photoUpdated"), "");
    } catch (e) {
      logError("profile.avatarUpload", e);
      toast.error(t("common.error"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setPhotoOpen(false);
    if (!avatarUrl) return;
    setUploading(true);
    try {
      await updateProfile.mutateAsync({ avatarUrl: null });
      void deleteAvatar(avatarUrl);
    } catch (e) {
      logError("profile.avatarRemove", e);
      toast.error(t("common.error"), e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function sendResetLink() {
    if (!email) return;
    setSendingLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_TO,
      });
      if (error) {
        logError("profile.resetLink", error.message);
        toast.error(t("common.error"), authErrorMessage(error.message));
        return;
      }
      toast.success(t("auth.linkSentTitle"), t("profile.resetLinkSent", { email }));
    } catch (e) {
      logError("profile.resetLink", e);
      toast.error(t("common.error"), e instanceof Error ? e.message : String(e));
    } finally {
      setSendingLink(false);
    }
  }

  function logout() {
    Alert.alert(t("nav.logout"), t("menu.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nav.logout"),
        style: "destructive",
        // `koproq.tsx` bilan bir xil tartib: token AVVAL o'chiriladi (signOut
        // dan keyin RLS `auth.uid()` yo'q), so'ng lokal sessiya tozalanadi.
        onPress: async () => {
          await unregisterPushToken();
          await supabase.auth.signOut({ scope: "local" });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title={t("profile.title")} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════
            TEPA KARTA — rasm, ism, email, rol
        ══════════════════════════════════════════════ */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.xl,
            padding: 18,
            marginBottom: 22,
            alignItems: "center",
            gap: 12,
            ...shadowGlow(colors.primary),
          }}
        >
          <Pressable
            onPress={() => setPhotoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("profile.changePhoto")}
            style={{ width: 88, height: 88 }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: radius.full,
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.35)",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  contentFit="cover"
                  transition={150}
                  style={{ width: 88, height: 88 }}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Text style={{ fontSize: text.xl2, fontWeight: "800", color: "#fff" }}>
                  {initials(name)}
                </Text>
              )}
              {uploading ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(15,61,110,0.55)",
                  }}
                >
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
            {/* Kamera nishoni — rasm almashtirish mumkinligini ko'rsatadi */}
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 30,
                height: 30,
                borderRadius: radius.full,
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: colors.primaryDeep,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={15} color={colors.primary} />
            </View>
          </Pressable>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text
              style={{ fontSize: text.xl, fontWeight: "800", color: "#fff" }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={{ fontSize: text.sm, color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
              {email}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          >
            <Ionicons name={isOwner ? "shield-checkmark" : "person"} size={12} color="#fff" />
            <Text style={{ fontSize: text.xs, fontWeight: "600", color: "#fff" }}>
              {isOwner ? t("staff.owner") : t("staff.cashier")}
            </Text>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════
            SHAXSIY MA'LUMOT
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("profile.sectionPersonal")} />
        <Card style={{ marginBottom: 22 }}>
          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <NameEditor
              // Profil yuklangach maydon boshlang'ich qiymat bilan qayta
              // yaratiladi (effektsiz sinxronlash).
              key={profile?.full_name ?? "empty"}
              initial={profile?.full_name ?? ""}
              email={email}
            />
          )}
        </Card>

        {/* ══════════════════════════════════════════════
            XAVFSIZLIK
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("profile.sectionSecurity")} />
        <Card padded={false} elevated style={{ overflow: "hidden", marginBottom: 22 }}>
          <SettingRow
            icon={hasGoogle ? "logo-google" : "mail-outline"}
            title={t("profile.signInMethod")}
            subtitle={providerLabel}
          />
          {hasPassword ? (
            <SettingRow
              icon="lock-closed-outline"
              title={t("profile.changePassword")}
              subtitle={t("profile.changePasswordSub")}
              onPress={() => setPasswordOpen(true)}
            />
          ) : null}
          <SettingRow
            icon="mail-unread-outline"
            title={hasPassword ? t("profile.resetLink") : t("profile.setPassword")}
            subtitle={hasPassword ? t("profile.resetLinkSub") : t("profile.setPasswordSub")}
            onPress={sendResetLink}
            right={sendingLink ? <ActivityIndicator color={colors.primary} /> : undefined}
            last
          />
        </Card>

        {/* ══════════════════════════════════════════════
            HISOB
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("profile.sectionAccount")} />
        <Card padded={false} elevated style={{ overflow: "hidden", marginBottom: 22 }}>
          <SettingRow
            icon="storefront-outline"
            title={active?.shop.name ?? t("common.appName")}
            subtitle={isOwner ? t("staff.owner") : t("staff.cashier")}
          />
          {user?.created_at ? (
            <SettingRow
              icon="calendar-outline"
              title={t("profile.memberSince")}
              subtitle={formatDate(user.created_at)}
              right={<View />}
            />
          ) : null}
          <SettingRow
            icon="settings-outline"
            title={t("settings.title")}
            subtitle={t("profile.settingsSub")}
            onPress={() => router.push("/settings")}
            last
          />
        </Card>

        {/* ══════════════════════════════════════════════
            CHIQISH
        ══════════════════════════════════════════════ */}
        <Card padded={false} elevated style={{ overflow: "hidden" }}>
          <SettingRow icon="log-out-outline" title={t("nav.logout")} onPress={logout} danger last />
        </Card>
      </ScrollView>

      {/* Rasm manbasini tanlash */}
      <BottomSheet visible={photoOpen} onClose={() => setPhotoOpen(false)}>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>
            {t("profile.changePhoto")}
          </Text>
          <Button label={t("uploader.camera")} onPress={() => pickPhoto("camera")} />
          <Button
            variant="ghost"
            label={t("uploader.gallery")}
            onPress={() => pickPhoto("library")}
          />
          {avatarUrl ? (
            <Button variant="ghost" label={t("profile.removePhoto")} onPress={removePhoto} />
          ) : null}
        </View>
      </BottomSheet>

      <ChangePasswordSheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        email={email}
      />
    </SafeAreaView>
  );
}

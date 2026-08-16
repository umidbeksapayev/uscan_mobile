import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { pickAndCompress, type ImageSource } from "@/lib/pick-image";
import { uploadAvatar, deleteAvatar } from "@/lib/storage";
import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { SettingRow } from "@/components/ui/setting-row";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-context";
import { useActivePermissions } from "@/features/auth/use-memberships";
import { useMyInvites } from "@/features/auth/use-invites";
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
  const { isOwner } = useActivePermissions();
  // Menga kelgan takliflar — soni nishonda ko'rsatiladi. Bildirishnomalar
  // markazi ham xuddi shu hook'ni ishlatadi, ya'ni kesh bitta.
  const { data: myInvites } = useMyInvites();
  const inviteCount = myInvites?.length ?? 0;

  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const user = session?.user;
  const email = user?.email ?? "";
  const name = displayName(profile, email, t("profile.fallbackName"));
  const avatarUrl = profile?.avatar_url ?? null;

  // Parol bormi — "Parolni o'zgartirish" qatori shunga qarab chiqadi.
  // `identities` sessiyada keladi, qo'shimcha tarmoq so'rovi shart emas.
  //
  // "Kirish usuli" ma'lumot qatori ATAYLAB olib tashlandi: u bosilmasdi va
  // hech narsa qilmasdi — parol yo'q foydalanuvchi buni pastdagi "Parol
  // o'rnatish" qatoridan ham tushunadi.
  const hasPassword = (user?.identities ?? []).some((i) => i.provider === "email");

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

  /*
    "Chiqish" bu ekrandan ATAYLAB olib tashlandi — u `koproq.tsx` da bor va
    ikkita bir xil chiqish tugmasi ikkita boshqa narsadek ko'rinardi.
    Xuddi shu sabab "Hisob" bo'limi ham yo'q: do'kon nomi, rol va
    Sozlamalar havolasi — uchalasi ham Ko'proq tabida.
  */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title={t("profile.title")} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════
            KIMLIK — rasm, ism, rol

            Kartasiz, to'g'ridan-to'g'ri sahifa fonida. Ilgari bu blok ko'k
            gradient "hero" karta edi: u ekrandagi eng katta rangli sirt
            bo'lib, hech qanday ma'lumot bermasdi. Endi rang faqat
            avatarda — ya'ni ko'z avval ISMga tushadi.
        ══════════════════════════════════════════════ */}
        <View style={{ alignItems: "center", gap: 14, paddingTop: 12, paddingBottom: 28 }}>
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
                backgroundColor: colors.primaryTint,
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
                <Text style={{ fontSize: text.xl2, fontWeight: "700", color: colors.primary }}>
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
                    backgroundColor: "rgba(15,23,42,0.45)",
                  }}
                >
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
            {/* Kamera nishoni — rasm almashtirish mumkinligini ko'rsatadi.
                Chegara rangi `bg` (primaryDeep emas): nishon sahifa fonini
                "kesib" turadi, ya'ni tungi rejimda ham to'g'ri ko'rinadi. */}
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
                borderColor: colors.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={15} color={colors.muted} />
            </View>
          </Pressable>

          <View style={{ alignItems: "center", gap: 3 }}>
            <Text
              style={{ fontSize: text.xl, fontWeight: "700", color: colors.ink }}
              numberOfLines={1}
            >
              {name}
            </Text>
            {/* Rol — nishon EMAS, oddiy matn. To'ldirilgan pill bu yerda
                hech narsani ta'kidlamasdi (rol o'zgarmaydi, bosilmaydi). */}
            <Text style={{ fontSize: text.xs, color: colors.muted }}>
              {isOwner ? t("staff.owner") : t("staff.cashier")}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════
            SHAXSIY MA'LUMOT
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("profile.sectionPersonal")} />
        <Card style={{ marginBottom: 24 }}>
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
        <Card padded={false} style={{ overflow: "hidden", marginBottom: 24 }}>
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
            TAKLIFLAR

            Doim ko'rinadi (faqat taklif kelganda emas): profil — uni
            qidiradigan barqaror joy. Ilgari taklif faqat Bosh sahifadagi
            qo'ng'iroqchada ko'rinardi, ya'ni o'qilgandan keyin yo'qolardi.
        ══════════════════════════════════════════════ */}
        <SectionLabel label={t("profile.sectionInvites")} />
        <Card padded={false} style={{ overflow: "hidden" }}>
          <SettingRow
            icon="mail-open-outline"
            title={t("myInvites.title")}
            subtitle={t("myInvites.rowSub")}
            onPress={() => router.push("/my-invites")}
            right={
              inviteCount > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      minWidth: 22,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: radius.full,
                      backgroundColor: colors.danger,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: text.xs, fontWeight: "700", color: "#fff" }}>
                      {inviteCount}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
                </View>
              ) : undefined
            }
            last
          />
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

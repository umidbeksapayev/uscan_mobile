import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase } from "@/lib/supabase";
import { authErrorMessage, authLinkErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { withTimeout } from "@/lib/with-timeout";
import { useDeepLinkStore, consumeDeepLink, isDeepLinkConsumed } from "@/lib/deep-link";
import { parseAuthUrlError, describeAuthUrl } from "@/features/auth/parse-auth-url";
import { parseRecoveryParams, type RecoveryTokens } from "@/features/auth/parse-recovery-url";
import { useRecoveryStore } from "@/features/auth/recovery-store";
import { useAuth } from "@/features/auth/auth-context";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/** GoTrueClient RN'da ba'zan abadiy osilib qoladi (`lib/supabase.ts`dagi
 *  `noopLock` izohi) — shuning uchun bu ekran ham muhlatsiz kuta olmaydi. */
const SET_SESSION_TIMEOUT_MS = 15_000;

/**
 * Email'dagi "parolni tiklash" havolasi shu yerga tushadi
 * (`uscan://reset-password#access_token=...&refresh_token=...&type=recovery`).
 * Tokenlarni fragment'dan olib `setSession` bilan vaqtinchalik sessiya
 * o'rnatamiz, foydalanuvchi yangi parol kiritgach `updateUser` bilan saqlaymiz.
 */
export default function ResetPasswordScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const url = Linking.useURL();
  const { initializing } = useAuth();
  // Reaktiv: havola ekran ochilgandan KEYIN kelsa ham effekt qayta ishlaydi.
  const capturedUrl = useDeepLinkStore((s) => s.url);
  // Oqim holati do'konda — sabab `recovery-store.ts` izohida (ekran sessiya
  // o'rnatilganda AuthGate tomonidan qayta yaratiladi).
  const phase = useRecoveryStore((s) => s.phase);
  const linkError = useRecoveryStore((s) => s.error);
  const setPhase = useRecoveryStore((s) => s.setPhase);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // `initializing` tugashini kutamiz: `auth-context.tsx`ning o'z
  // `getSession()` chaqiruvi bilan bu yerdagi `setSession()` bir vaqtda
  // ketsa, GoTrueClient RN'da ba'zan abadiy osilib qoladi — ketma-ketlik
  // shu poyga holatini oldini oladi. `withTimeout` esa qo'shimcha himoya.
  useEffect(() => {
    if (initializing) return;
    // `setSession()` ketayotgan bo'lsa aralashmaymiz. Qolgan bosqichlarda
    // effekt ishlayveradi, lekin pastda faqat HALI ISHLATILMAGAN havola
    // qaraladi — yangisi kelmasa hech narsa o'zgarmaydi. (Bu effekt har
    // render'da, shu jumladan AuthGate qayta yaratgan yangi mount'da ham
    // ishga tushadi.)
    if (phase === "establishing") return;

    async function establishSession() {
      const initialUrl = await Linking.getInitialURL();
      // Uchta manba: `useURL()`, sovuq start va ilova ISHLAB TURGANDA
      // ushlangan havola (`lib/deep-link.ts`). Allaqachon ishlatilganini
      // chetlab o'tamiz — bir martalik token ikkinchi marta yaramaydi.
      const candidates = [url, initialUrl, capturedUrl].filter(
        (u): u is string => Boolean(u) && !isDeepLinkConsumed(u),
      );

      let tokens: RecoveryTokens | null = null;
      let tokenUrl: string | null = null;
      for (const candidate of candidates) {
        const parsed = parseRecoveryParams(candidate);
        if (parsed) {
          tokens = parsed;
          tokenUrl = candidate;
          break;
        }
      }

      if (!tokens) {
        // Havola XATO bilan qaytgan bo'lishi mumkin — sababini ko'rsatamiz
        // (avval hamma holat bir xil "yaroqsiz" bo'lib ko'rinardi).
        const failure = candidates.map((c) => parseAuthUrlError(c)).find(Boolean);
        if (failure) {
          candidates.forEach(consumeDeepLink);
          logError("reset-password.linkError", `${failure.code}: ${failure.description ?? ""}`);
          setPhase("invalid", authLinkErrorMessage(failure.code));
          return;
        }
        // Na token, na xato. Birinchi marta — aynan NIMA kelganini jurnalga
        // yozamiz (token qiymatlarisiz); keyingi render'larda jim, aks holda
        // jurnal bir xil yozuv bilan to'lib ketadi.
        if (phase === "idle") {
          logError(
            "reset-password.unexpectedLink",
            `useURL: ${describeAuthUrl(url)} | initial: ${describeAuthUrl(initialUrl)} | captured: ${describeAuthUrl(capturedUrl)}`,
          );
          setPhase("invalid", null);
        }
        return;
      }

      // Token topildi. Havolani DARHOL "ishlatilgan" deb belgilaymiz —
      // ilgari bu yerda do'kon tozalanardi (`setUrl(null)`), bu esa shu
      // effektni qayta ishga tushirib, oqimni o'zi buzardi. Qaytish qiymati
      // parallel yurishlardan himoya qiladi (birinchisi oladi).
      if (!consumeDeepLink(tokenUrl)) return;
      setPhase("establishing");
      // ATAYLAB `cancelled` bayrog'i yo'q: sessiya o'rnatilishi bilan
      // AuthGate ekran daraxtini qayta yaratadi va bu effekt "bekor
      // qilingan" bo'lib qoladi. Natijani tashlab yuborsak — ekran abadiy
      // kutishda qolardi. Holat do'konda bo'lgani uchun unmount muhim emas.
      try {
        const { error } = await withTimeout(
          supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          }),
          SET_SESSION_TIMEOUT_MS,
        );
        if (error) {
          logError("reset-password.setSession", error.message);
          setPhase("invalid", authErrorMessage(error.message));
          return;
        }
        setPhase("ready");
      } catch (e) {
        logError("reset-password.setSession", e);
        setPhase("invalid", "Ulanish juda uzoq davom etdi. Havolani qaytadan so'rang.");
      }
    }

    void establishSession();
  }, [url, initializing, capturedUrl, phase, setPhase]);

  async function onSave() {
    setFormError(null);
    if (password.length < 6) {
      setFormError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setFormError(t("auth.passwordsMismatch"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(authErrorMessage(error.message));
        return;
      }
      // Bu yerda qo'lda yo'naltirmaymiz — AuthGate `recoveryActive`
      // yolg'onga aylanganini ko'rib, do'kon holatiga qarab (tabs) yoki
      // (onboarding)ga to'g'ri yo'naltiradi (parolni tiklagan user hali
      // onboarding'ni tugatmagan bo'lishi ham mumkin, garchi kamdan-kam).
      setPhase("done");
    } catch (e) {
      logError("reset-password.updateUser", e);
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (phase !== "ready" && phase !== "invalid") {
    return (
      <AuthShell title={t("auth.checkingLink")}>
        <View className="items-center py-4">
          <ActivityIndicator color={colors.primary} />
        </View>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell title={t("auth.linkInvalidTitle")} subtitle={linkError ?? t("auth.linkInvalidBody")}>
        <View className="items-center gap-4">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.dangerTint }}
          >
            <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
          </View>
          <Pressable
            onPress={() => {
              // Oqim qaytadan boshlanadi — eski "yaroqsiz" holati yangi
              // havolani kutib turmasligi kerak.
              setPhase("idle");
              router.replace("/(auth)/forgot-password");
            }}
            className="p-2"
          >
            <Text className="text-sm font-medium text-primary">{t("auth.requestAgain")}</Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.newPasswordTitle")} subtitle={t("auth.newPasswordSubtitle")}>
      <View style={{ gap: 14 }}>
        <Field
          label={t("auth.newPasswordLabel")}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (formError) setFormError(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />
        <Field
          label={t("auth.confirmPasswordLabel")}
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            if (formError) setFormError(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />

        <Button label={t("common.save")} onPress={onSave} loading={saving} />
        {formError ? <Text className="text-center text-sm text-danger">{formError}</Text> : null}
      </View>
    </AuthShell>
  );
}

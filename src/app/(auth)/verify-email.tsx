import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase } from "@/lib/supabase";
import { authErrorMessage, authLinkErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { withTimeout } from "@/lib/with-timeout";
import { parseAuthUrlTokens, parseAuthUrlError } from "@/features/auth/parse-auth-url";
import { useAuth } from "@/features/auth/auth-context";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";

/** Havola `uscan://verify-email`ga yo'naltiradi — Supabase loyihasida
 *  Authentication → URL Configuration → Redirect URLs'ga qo'shilishi shart
 *  (xuddi `uscan://reset-password` kabi — ko'r. forgot-password.tsx). */
const REDIRECT_TO = "uscan://verify-email";
const RESEND_COOLDOWN = 60;
/** GoTrueClient RN'da ba'zan abadiy osilib qoladi (`lib/supabase.ts`dagi
 *  `noopLock` izohi) — shuning uchun bu ekran ham muhlatsiz kuta olmaydi. */
const SET_SESSION_TIMEOUT_MS = 15_000;

type Status = "waiting" | "confirming" | "invalid";

/**
 * Ro'yxatdan o'tgach shu ekranga tushiladi (`?email=...`). Ikki holatda ham
 * shu fayl ishlaydi:
 *  1) Oddiy holat — "pochtangizni tekshiring" xabari + qayta yuborish.
 *  2) Foydalanuvchi email'dagi tasdiqlash havolasini bosganda
 *     (`uscan://verify-email#access_token=...&type=signup`) — token'lar
 *     `setSession` bilan o'rnatiladi, keyin AuthGate sessiyani ko'rib
 *     avtomatik (tabs)ga (yoki 2-bosqichdan keyin onboarding'ga) o'tkazadi.
 */
export default function VerifyEmailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const url = Linking.useURL();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { initializing } = useAuth();

  const [status, setStatus] = useState<Status>("waiting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tasdiqlash havolasi orqali ochilganmi — bo'lsa sessiyani o'rnatamiz.
  //
  // `initializing` tugashini kutamiz: `auth-context.tsx`ning o'z
  // `getSession()` chaqiruvi bilan bu yerdagi `setSession()` bir vaqtda
  // ketsa, GoTrueClient RN'da ba'zan abadiy osilib qoladi (`lib/supabase.ts`
  // dagi `noopLock` izohiga qarang) — ketma-ketlashtirish shu poyga holatini
  // oldini oladi. Qo'shimcha himoya sifatida `withTimeout` ham bor — sabab
  // boshqa bo'lsa ham ekran hech qachon abadiy "tekshirilmoqda"da qolmasin.
  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    async function tryConfirm() {
      const initialUrl = await Linking.getInitialURL();
      const tokens =
        parseAuthUrlTokens(url, "signup") ?? parseAuthUrlTokens(initialUrl, "signup");
      if (!tokens) {
        // Havola xato bilan qaytgan bo'lsa sababini ko'rsatamiz; aks holda
        // bu oddiy holat — foydalanuvchi ekranni to'g'ridan-to'g'ri ochgan
        // va "pochtangizni tekshiring" matni ko'rinaveradi.
        const linkError = parseAuthUrlError(url) ?? parseAuthUrlError(initialUrl);
        if (linkError && !cancelled) {
          logError("verify-email.linkError", `${linkError.code}: ${linkError.description ?? ""}`);
          setErrorMsg(authLinkErrorMessage(linkError.code));
          setStatus("invalid");
        }
        return;
      }

      setStatus("confirming");
      try {
        const { error } = await withTimeout(
          supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          }),
          SET_SESSION_TIMEOUT_MS,
        );
        if (cancelled) return;
        if (error) {
          setErrorMsg(authErrorMessage(error.message));
          setStatus("invalid");
          return;
        }
        // Sessiya o'rnatildi → AuthGate avtomatik yo'naltiradi.
      } catch (e) {
        if (cancelled) return;
        logError("verify-email.setSession", e);
        setErrorMsg("Ulanish juda uzoq davom etdi. Pastdagi tugma orqali qaytadan urinib ko'ring.");
        setStatus("invalid");
      }
    }
    void tryConfirm();
    return () => {
      cancelled = true;
    };
  }, [url, initializing]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function onResend() {
    if (!email || cooldown > 0) return;
    setResending(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: REDIRECT_TO },
      });
      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setResending(false);
    }
  }

  if (status === "confirming") {
    return (
      <AuthShell title={t("auth.checkingLink")}>
        <View className="items-center py-4">
          <ActivityIndicator color={colors.primary} />
        </View>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell title={t("auth.linkInvalidTitle")} subtitle={errorMsg ?? t("auth.linkInvalidBody")}>
        <View style={{ gap: 12 }}>
          {email ? (
            <Button
              label={cooldown > 0 ? t("auth.resendCooldown", { sec: cooldown }) : t("auth.resend")}
              onPress={onResend}
              loading={resending}
              disabled={cooldown > 0}
            />
          ) : null}
          <Button
            variant="ghost"
            label={t("auth.backToLogin")}
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.verifyTitle")}
      subtitle={email ? t("auth.verifySubtitle", { email }) : t("auth.verifySubtitleGeneric")}
    >
      <View style={{ gap: 12 }}>
        <View
          className="flex-row items-center gap-3 rounded-2xl p-4"
          style={{ backgroundColor: colors.primaryTint }}
        >
          <Ionicons name="mail-outline" size={22} color={colors.primary} />
          <Text className="flex-1 text-sm text-ink">{t("auth.verifyHint")}</Text>
        </View>

        {email ? (
          <Button
            label={cooldown > 0 ? t("auth.resendCooldown", { sec: cooldown }) : t("auth.resend")}
            onPress={onResend}
            loading={resending}
            disabled={cooldown > 0}
          />
        ) : null}
        {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}

        <Button
          variant="ghost"
          label={t("auth.backToLogin")}
          onPress={() => router.replace("/(auth)/login")}
        />
      </View>
    </AuthShell>
  );
}

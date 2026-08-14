import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { parseRecoveryParams } from "@/features/auth/parse-recovery-url";
import { useRecoveryStore } from "@/features/auth/recovery-store";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type Status = "checking" | "ready" | "invalid" | "done";

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
  const setRecoveryActive = useRecoveryStore((s) => s.setActive);

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function establishSession() {
      const tokens = parseRecoveryParams(url) ?? parseRecoveryParams(await Linking.getInitialURL());
      if (!tokens) {
        if (!cancelled) setStatus((s) => (s === "checking" ? "invalid" : s));
        return;
      }
      setRecoveryActive(true);
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (cancelled) return;
      if (error) {
        setRecoveryActive(false);
        setErrorMsg(authErrorMessage(error.message));
        setStatus("invalid");
        return;
      }
      setStatus("ready");
    }
    void establishSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function onSave() {
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setErrorMsg(t("auth.passwordsMismatch"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }
      setStatus("done");
      // Bu yerda qo'lda yo'naltirmaymiz — AuthGate `recoveryActive`
      // yolg'onga aylanganini ko'rib, do'kon holatiga qarab (tabs) yoki
      // (onboarding)ga to'g'ri yo'naltiradi (parolni tiklagan user hali
      // onboarding'ni tugatmagan bo'lishi ham mumkin, garchi kamdan-kam).
      setRecoveryActive(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (status === "checking") {
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
        <View className="items-center gap-4">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.dangerTint }}
          >
            <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
          </View>
          <Pressable onPress={() => router.replace("/(auth)/forgot-password")} className="p-2">
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
            if (errorMsg) setErrorMsg(null);
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
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />

        <Button label={t("common.save")} onPress={onSave} loading={saving} />
        {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}
      </View>
    </AuthShell>
  );
}

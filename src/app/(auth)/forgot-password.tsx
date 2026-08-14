import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/** Havola `uscan://reset-password`ga yo'naltiradi — Supabase loyihasida
 *  Authentication → URL Configuration → Redirect URLs'ga qo'shilishi shart. */
const REDIRECT_TO = "uscan://reset-password";

export default function ForgotPasswordScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg(t("auth.emailRequired"));
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg(t("auth.notConfigured"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: REDIRECT_TO,
      });
      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }
      setSent(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      className="p-2"
      hitSlop={10}
    >
      <Ionicons name="arrow-back" size={22} color="#fff" />
    </Pressable>
  );

  if (sent) {
    return (
      <AuthShell title={t("auth.linkSentTitle")} subtitle={t("auth.linkSentBody", { email: email.trim() })}>
        <View className="items-center gap-4">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.successTint }}
          >
            <Ionicons name="mail-outline" size={30} color={colors.success} />
          </View>
          <Button label={t("auth.backToLogin")} onPress={() => router.replace("/(auth)/login")} />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")} topLeft={backButton}>
      <View style={{ gap: 14 }}>
        <Field
          label={t("auth.email")}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder={t("auth.emailPlaceholder")}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Button label={t("auth.forgotSend")} onPress={onSubmit} loading={loading} />
        {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}
      </View>
    </AuthShell>
  );
}

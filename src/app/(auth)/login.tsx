import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleAuthBlock } from "@/features/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function LoginScreen() {
  const colors = useColors();

  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit() {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg(t("auth.fillAllFields"));
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg(t("auth.notConfigured"));
      return;
    }

    setLoading(true);
    try {
      const signIn = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      // Sekin internet (3G / qishloq) uchun keng oraliq.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t("auth.errNetworkTimeout"))), 30000),
      );
      const { data, error } = await Promise.race([signIn, timeout]);

      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }
      if (!data.session) {
        setErrorMsg(t("auth.errEmailNotConfirmed"));
        return;
      }
      // Muvaffaqiyat → AuthGate avtomatik tabs'ga yo'naltiradi.
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth.welcome")} subtitle={t("auth.loginSubtitle")}>
      <View style={{ gap: 14 }}>
        <GoogleAuthBlock onError={setErrorMsg} disabled={loading} />

        <Field
          testID="login-email"
          label={t("auth.email")}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder={t("auth.emailPlaceholder")}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <View style={{ gap: 6 }}>
          <Text className="text-sm font-medium text-ink">{t("auth.password")}</Text>
          <View
            className="flex-row items-center rounded-2xl border border-line bg-surface px-4"
            style={{ height: 52 }}
          >
            <TextInput
              testID="login-password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.tabInactive}
              secureTextEntry={!showPass}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              className="flex-1 text-base text-ink"
              style={{ height: 52 }}
            />
            <Pressable
              onPress={() => setShowPass((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.togglePassword", "Parolni ko'rsatish yoki yashirish")}
            >
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.tabInactive}
              />
            </Pressable>
          </View>
        </View>

        <Link href="/(auth)/forgot-password" className="text-right text-sm text-primary">
          {t("auth.forgotPassword")}
        </Link>

        <Button testID="login-submit" label={t("auth.loginBtn")} onPress={onSubmit} loading={loading} />
        {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}

        <View className="mt-2 flex-row justify-center">
          <Text className="text-sm text-muted">{t("auth.noAccount")} </Text>
          <Link href="/(auth)/register" className="text-sm font-medium text-primary">
            {t("auth.registerBtn")}
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}

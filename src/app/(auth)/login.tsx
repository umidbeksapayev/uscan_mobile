import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/logo";
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
      setErrorMsg("Email va parolni kiriting.");
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg("Supabase sozlanmagan (.env).");
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
        setTimeout(() => reject(new Error("Tarmoq javob bermadi. Qayta urinib ko'ring.")), 30000),
      );
      const { data, error } = await Promise.race([signIn, timeout]);

      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }
      if (!data.session) {
        setErrorMsg("Kirib bo'lmadi. Email tasdiqlanmagan bo'lishi mumkin.");
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
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <Logo size={34} />
        </View>

        <Text className="text-center text-2xl font-medium text-ink">{t("auth.welcome")}</Text>
        <Text className="mb-6 mt-1 text-center text-sm text-muted">
          {t("auth.loginSubtitle")}
        </Text>

        <View style={{ gap: 16 }}>
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

          <Button testID="login-submit" label={t("auth.loginBtn")} onPress={onSubmit} loading={loading} />
          {errorMsg ? (
            <Text className="text-center text-sm text-danger">{errorMsg}</Text>
          ) : null}

          <Link href="/(auth)/forgot-password" className="text-center text-sm text-primary">
            {t("auth.forgotPassword")}
          </Link>
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">{t("auth.noAccount")} </Text>
          <Link href="/(auth)/register" className="text-sm font-medium text-primary">
            {t("auth.registerBtn")}
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

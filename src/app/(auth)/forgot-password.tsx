import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
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

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          className="absolute left-4 top-4 p-2"
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>

        {sent ? (
          <View className="items-center">
            <View
              className="mb-4 h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.successTint }}
            >
              <Ionicons name="mail-outline" size={36} color={colors.success} />
            </View>
            <Text className="text-center text-xl font-medium text-ink">{t("auth.linkSentTitle")}</Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {t("auth.linkSentBody", { email: email.trim() })}
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")} className="mt-6 p-2">
              <Text className="text-sm font-medium text-primary">{t("auth.backToLogin")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text className="text-center text-2xl font-medium text-ink">{t("auth.forgotTitle")}</Text>
            <Text className="mb-6 mt-1 text-center text-sm text-muted">
              {t("auth.forgotSubtitle")}
            </Text>

            <View style={{ gap: 16 }}>
              <Field
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

              <Button label={t("auth.forgotSend")} onPress={onSubmit} loading={loading} />
              {errorMsg ? (
                <Text className="text-center text-sm text-danger">{errorMsg}</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

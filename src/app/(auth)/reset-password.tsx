import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { parseRecoveryParams } from "@/features/auth/parse-recovery-url";
import { useRecoveryStore } from "@/features/auth/recovery-store";
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
  const router = useRouter();
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
      setErrorMsg("Parol kamida 6 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Parollar mos kelmadi.");
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
      setRecoveryActive(false);
      router.replace("/(tabs)");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {status === "checking" ? (
          <View className="items-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-muted">Havola tekshirilmoqda...</Text>
          </View>
        ) : status === "invalid" ? (
          <View className="items-center">
            <View
              className="mb-4 h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "#FDECEC" }}
            >
              <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
            </View>
            <Text className="text-center text-xl font-medium text-ink">Havola yaroqsiz</Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {errorMsg ?? "Havola muddati o'tgan yoki noto'g'ri. Qaytadan so'rang."}
            </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/forgot-password")}
              className="mt-6 p-2"
            >
              <Text className="text-sm font-medium text-primary">Qaytadan so'rash</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text className="text-center text-2xl font-medium text-ink">Yangi parol</Text>
            <Text className="mb-6 mt-1 text-center text-sm text-muted">
              Hisobingiz uchun yangi parol o'rnating
            </Text>

            <View style={{ gap: 16 }}>
              <Field
                label="Yangi parol"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="off"
                textContentType="none"
              />
              <Field
                label="Parolni tasdiqlang"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="off"
                textContentType="none"
              />

              <Button label="Saqlash" onPress={onSave} loading={saving} />
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

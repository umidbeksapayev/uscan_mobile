import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
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
      setErrorMsg(authErrorMessage(e instanceof Error ? e.message : null));
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

        <Text className="text-center text-2xl font-medium text-ink">Xush kelibsiz</Text>
        <Text className="mb-6 mt-1 text-center text-sm text-muted">
          Tizimga kirish uchun ma'lumotlarni kiriting
        </Text>

        <View style={{ gap: 16 }}>
          <Field
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="email@misol.uz"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Parol"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
          />
          <Button label="Kirish" onPress={onSubmit} loading={loading} />
          {errorMsg ? (
            <Text className="text-center text-sm text-danger">{errorMsg}</Text>
          ) : null}
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">Akkauntingiz yo'qmi? </Text>
          <Link href="/(auth)/register" className="text-sm font-medium text-primary">
            Ro'yxatdan o'tish
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

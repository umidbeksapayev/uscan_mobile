import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
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

  async function onSubmit() {
    if (!email.trim() || !password) {
      Alert.alert("Ma'lumot yetishmaydi", "Email va parolni kiriting.");
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase sozlanmagan", ".env fayliga web bilan bir xil Supabase URL va anon key qo'shing.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Kirish amalga oshmadi", authErrorMessage(error.message));
      return;
    }
    // Sessiya o'zgaradi → AuthGate avtomatik tabs'ga yo'naltiradi.
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
            onChangeText={setEmail}
            placeholder="email@misol.uz"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Parol"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
          />
          <Button label="Kirish" onPress={onSubmit} loading={loading} />
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

import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function RegisterScreen() {
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!shopName.trim() || !email.trim() || !password) {
      Alert.alert("Ma'lumot yetishmaydi", "Barcha maydonlarni to'ldiring.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Parol qisqa", "Parol kamida 6 belgidan iborat bo'lsin.");
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase sozlanmagan", ".env fayliga web bilan bir xil Supabase URL va anon key qo'shing.");
      return;
    }

    setLoading(true);
    // Do'kon nomi metadata orqali → DB trigger shops + owner a'zoligini yaratadi.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { shop_name: shopName.trim() } },
    });

    if (error) {
      setLoading(false);
      Alert.alert("Ro'yxatdan o'tish amalga oshmadi", authErrorMessage(error.message));
      return;
    }

    // "Confirm email" o'chirilgan bo'lsa signUp sessiya qaytaradi; aks holda
    // darhol login/parol bilan kirishga harakat qilamiz.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setLoading(false);
        Alert.alert(
          "Avtomatik kirish bo'lmadi",
          "Akkaunt yaratildi. Iltimos, kirish sahifasidan qo'lda kiring.",
        );
        return;
      }
    }
    setLoading(false);
    // Sessiya bor → AuthGate tabs'ga yo'naltiradi.
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

        <Text className="text-center text-2xl font-medium text-ink">Ro'yxatdan o'tish</Text>
        <Text className="mb-6 mt-1 text-center text-sm text-muted">
          Do'koningizni yarating va boshlang
        </Text>

        <View style={{ gap: 16 }}>
          <Field
            label="Do'kon nomi"
            value={shopName}
            onChangeText={setShopName}
            placeholder="Masalan: Aziz Market"
          />
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
            placeholder="Kamida 6 belgi"
            secureTextEntry
            autoComplete="new-password"
          />
          <Button label="Ro'yxatdan o'tish" onPress={onSubmit} loading={loading} />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">Akkauntingiz bormi? </Text>
          <Link href="/(auth)/login" className="text-sm font-medium text-primary">
            Kirish
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

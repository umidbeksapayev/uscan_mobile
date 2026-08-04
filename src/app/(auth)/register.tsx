import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { toast } from "@/lib/toast";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!shopName.trim() || !email.trim() || !password) {
      toast.error("Ma'lumot yetishmaydi", "Barcha maydonlarni to'ldiring.");
      return;
    }
    if (password.length < 6) {
      toast.error("Parol qisqa", "Parol kamida 6 belgidan iborat bo'lsin.");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Supabase sozlanmagan", ".env fayliga web bilan bir xil Supabase URL va anon key qo'shing.");
      return;
    }

    setLoading(true);
    // Do'kon nomi metadata orqali → DB trigger shops + owner a'zoligini yaratadi.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { shop_name: shopName.trim() } },
    });

    if (error) {
      setLoading(false);
      toast.error("Ro'yxatdan o'tish amalga oshmadi", authErrorMessage(error.message));
      return;
    }

    // "Confirm email" o'chirilgan bo'lsa signUp sessiya qaytaradi; aks holda
    // darhol login/parol bilan kirishga harakat qilamiz.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr) {
        setLoading(false);
        toast.info(
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

        <Text className="text-center text-2xl font-medium text-ink">{t("auth.registerBtn")}</Text>
        <Text className="mb-6 mt-1 text-center text-sm text-muted">
          {t("auth.registerSubtitle")}
        </Text>

        <View style={{ gap: 16 }}>
          <Field
            label={t("auth.shopName")}
            value={shopName}
            onChangeText={setShopName}
            placeholder={t("auth.shopNamePlaceholder")}
          />
          <Field
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.passwordHint")}
            secureTextEntry
            autoComplete="new-password"
          />
          <Button label={t("auth.registerBtn")} onPress={onSubmit} loading={loading} />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">{t("auth.haveAccount")} </Text>
          <Link href="/(auth)/login" className="text-sm font-medium text-primary">
            {t("auth.goLogin")}
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

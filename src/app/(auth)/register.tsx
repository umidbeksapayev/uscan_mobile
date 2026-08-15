import { useState } from "react";
import { View, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleAuthBlock } from "@/features/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/** Tasdiqlash xabaridagi havola shu yerga qaytadi (`verify-email.tsx`dagi
 *  bilan bir xil) — Supabase loyihasida Authentication → URL Configuration
 *  → Redirect URLs'ga qo'shilgan bo'lishi shart, aks holda standart Site
 *  URL'ga (web ilova) tushib qoladi. */
const REDIRECT_TO = "uscan://verify-email";

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit() {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg(t("auth.fillAllFields"));
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t("auth.passwordTooShort"));
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg(t("auth.notConfigured"));
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // Do'kon nomi ENDI bu yerda yo'q — onboarding (welcome → shop → done)
      // kiritadi. `handle_new_user()` shartli (040_onboarding.sql): shop_name
      // metadata kelmasa do'kon yaratilmaydi, AuthGate onboarding'ga o'tkazadi.
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: REDIRECT_TO },
      });

      if (error) {
        setErrorMsg(authErrorMessage(error.message));
        return;
      }

      // Supabase "email enumeration protection" yoqilganda mavjud email uchun
      // XATO QAYTARMAYDI — soxta muvaffaqiyat beradi va xat yubormaydi
      // (buzg'unchi "bu email ro'yxatdami?" deb tekshira olmasligi uchun).
      // Yagona farqlovchi belgi: `identities` bo'sh massiv bo'ladi. Busiz
      // foydalanuvchi hech qachon kelmaydigan xatni kutib qolardi.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setErrorMsg(t("auth.errAlreadyRegistered"));
        return;
      }

      if (data.session) {
        // "Confirm email" o'chirilgan (masalan lokal sinovda) — sessiya
        // darhol keldi, AuthGate tabs'ga o'tkazadi.
        return;
      }
      // Email tasdiqlash talab qilinadi.
      router.replace({ pathname: "/(auth)/verify-email", params: { email: normalizedEmail } });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth.registerBtn")} subtitle={t("auth.registerSubtitle")}>
      <View style={{ gap: 14 }}>
        <GoogleAuthBlock onError={setErrorMsg} disabled={loading} />

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
        <Field
          label={t("auth.password")}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder={t("auth.passwordHint")}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button label={t("auth.registerBtn")} onPress={onSubmit} loading={loading} />
        {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}

        <View className="mt-2 flex-row justify-center">
          <Text className="text-sm text-muted">{t("auth.haveAccount")} </Text>
          <Link href="/(auth)/login" className="text-sm font-medium text-primary">
            {t("auth.goLogin")}
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}

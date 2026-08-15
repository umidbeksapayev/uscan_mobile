import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { isGoogleSignInConfigured, signInWithGoogle, GoogleSignInError } from "./google-signin";
import { GoogleGIcon } from "./google-g-icon";

/**
 * Google native SDK bilan bitta bosishda kirish. `.env`da
 * `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` sozlanmagan bo'lsa tugma ham,
 * ajratkich ham umuman ko'rinmaydi — shu sabab ikkalasi bitta
 * komponentda (`GoogleAuthBlock`), aks holda sozlanmagan muhitda
 * ajratkich osilib qolardi.
 *
 * Joylashuvi ATAYLAB tepada: foydalanuvchilarimiz Android'da va deyarli
 * barchasida Gmail bor — Google yo'li bir bosishda tugaydi, email/parol
 * esa tasdiqlash qadamini talab qiladi. Shuning uchun tez yo'l birinchi
 * ko'rinadi, email/parol "boshqa yo'l" sifatida pastda qoladi.
 */
export function GoogleAuthBlock({
  onError,
  disabled,
}: {
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!isGoogleSignInConfigured) return null;

  async function onPress() {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Muvaffaqiyat → AuthGate sessiyani ko'rib avtomatik yo'naltiradi.
    } catch (e) {
      if (e instanceof GoogleSignInError) {
        // Foydalanuvchi o'zi bekor qilgan — xato ko'rsatish shart emas.
        if (e.code !== "cancelled") {
          onError(t(`auth.googleError.${e.code}`, { defaultValue: t("auth.googleError.supabase") }));
        }
      } else {
        onError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  const blocked = disabled || loading;

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel={t("auth.continueWithGoogle")}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-surface"
        style={{ height: 52, opacity: blocked ? 0.6 : 1 }}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <GoogleGIcon size={20} />
            <Text className="text-base font-medium text-ink">{t("auth.continueWithGoogle")}</Text>
          </>
        )}
      </Pressable>

      <View className="my-1 flex-row items-center gap-3">
        <View className="h-px flex-1" style={{ backgroundColor: colors.line }} />
        <Text className="text-xs text-muted">{t("auth.orWithEmail")}</Text>
        <View className="h-px flex-1" style={{ backgroundColor: colors.line }} />
      </View>
    </>
  );
}

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { LANGUAGES, setLanguage, DEFAULT_LANG, type LangCode } from "@/i18n";
import { useCompleteOnboarding } from "@/features/onboarding/use-onboarding";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";
import { onboardingErrorMessage } from "@/features/onboarding/onboarding-errors";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/** Til tanlash qatori — bosilganda darhol belgilanadi (o'ziga xos radio). */
function LanguageRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-row items-center justify-between rounded-2xl border p-4"
      style={{
        borderColor: selected ? colors.primary : colors.line,
        backgroundColor: selected ? colors.primaryTint : colors.surface,
      }}
    >
      <Text className="text-base text-ink">{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

/**
 * Onboarding 2-qadam — do'kon nomi + til. Ikkalasi ham `complete_onboarding()`
 * RPC'ga boradi (shops.name / shops.receipt_language + profiles.language),
 * til klientda ham darhol qo'llanadi (`setLanguage`).
 */
export default function OnboardingShopScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [shopName, setShopName] = useState("");
  const [language, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useCompleteOnboarding();
  const setCompleting = useOnboardingStore((s) => s.setCompleting);

  function onSubmit() {
    setErrorMsg(null);
    if (!shopName.trim()) {
      setErrorMsg(t("onboarding.shopNameRequired"));
      return;
    }
    // Bayroq so'rovdan OLDIN ko'tariladi: `useCompleteOnboarding` muvaffaqiyatda
    // `memberships` keshini yangilaydi va AuthGate darhol (tabs)ga uloqtirishi
    // mumkin — natijada 3-qadam ("Tayyor") ko'rinmay qolardi.
    setCompleting(true);
    mutation.mutate(
      { shopName: shopName.trim(), language },
      {
        onSuccess: () => {
          setLanguage(language);
          router.replace("/(onboarding)/done");
        },
        onError: (e) => {
          setCompleting(false);
          setErrorMsg(onboardingErrorMessage(e instanceof Error ? e.message : String(e)));
        },
      },
    );
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={3}
      footer={
        <>
          <Button label={t("onboarding.continue")} onPress={onSubmit} loading={mutation.isPending} />
          {errorMsg ? <Text className="text-center text-sm text-danger">{errorMsg}</Text> : null}
        </>
      }
    >
      <View style={{ gap: 22 }}>
        <View className="items-center" style={{ gap: 6 }}>
          <Text className="text-center text-2xl font-medium text-ink">{t("onboarding.shopTitle")}</Text>
          <Text className="text-center text-sm text-muted">{t("onboarding.shopSubtitle")}</Text>
        </View>

        <Field
          label={t("auth.shopName")}
          value={shopName}
          onChangeText={(v) => {
            setShopName(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder={t("auth.shopNamePlaceholder")}
        />

        <View style={{ gap: 8 }}>
          <Text className="text-sm font-medium text-ink">{t("onboarding.languageLabel")}</Text>
          <View style={{ gap: 8 }}>
            {LANGUAGES.map((lang) => (
              <LanguageRow
                key={lang.code}
                label={lang.label}
                selected={language === lang.code}
                onPress={() => setLangState(lang.code)}
              />
            ))}
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}

import type { ReactNode } from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/theme/theme-store";
import { radius } from "@/theme/tokens";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

/**
 * Login/register/forgot-password/reset-password uchun umumiy vizual qobiq —
 * ilgari har bir ekran o'zining markazlashtirilgan `ScrollView` + `Logo`
 * naqshini mustaqil takrorlardi (4 marta bir xil kod). Endi faqat forma
 * mazmuni (`children`) ekranga tegishli, hero + karta + Logo shu yerda.
 *
 * Gradient "hero" — dashboard/sozlamalar ekranidagi brend karta bilan bir
 * tilda (`colors.primary → colors.primaryDeep`, `shadowGlow`), lekin bu
 * yerda dekorativ fon: forma karta uning ustiga bir oz kirib turadi
 * (`marginTop: -N`), auth ekranlarini "faqat oq forma" dan farqlab turadi.
 */
export function AuthShell({
  title,
  subtitle,
  topLeft,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Orqaga tugmasi (forgot/reset-password) — hero ustida chap burchakda. */
  topLeft?: ReactNode;
  children: ReactNode;
}) {
  const colors = useColors();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            alignItems: "center",
            // Belgi bitta bo'lgach hero pastroq: klaviatura ochilganda forma
            // ko'proq joy oladi, karta esa hero'ga -40 bilan kirib turadi.
            paddingTop: 28,
            paddingBottom: 60,
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
          }}
        >
          {topLeft ? <View style={{ position: "absolute", left: 8, top: 12 }}>{topLeft}</View> : null}
          {/* BITTA belgi: ilgari bu yerda umumiy "scan" ikonasi + "uscan"
              matni turardi, karta ichida esa yana brend logosi — foydalanuvchi
              bitta ekranda ikkita logo ko'rardi. Endi hero'da faqat haqiqiy
              brend belgisi (oq variantda), karta esa to'g'ridan-to'g'ri
              sarlavhadan boshlanadi. */}
          <Logo size={30} tone="onDark" />
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: 20, marginTop: -40, paddingBottom: 24 }}>
          <Card elevated style={{ padding: 22 }}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Text className="text-center text-xl font-medium text-ink">{title}</Text>
              {subtitle ? (
                <Text className="mt-1 text-center text-sm text-muted">{subtitle}</Text>
              ) : null}
            </View>

            {children}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

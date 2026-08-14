import type { ReactNode } from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";
import { shadowGlow } from "@/theme/shadows";
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
            paddingTop: 20,
            paddingBottom: 56,
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
          }}
        >
          {topLeft ? <View style={{ position: "absolute", left: 8, top: 12 }}>{topLeft}</View> : null}
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: radius.lg,
              backgroundColor: "rgba(255,255,255,0.18)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.28)",
              alignItems: "center",
              justifyContent: "center",
              ...shadowGlow(colors.primaryDeep),
            }}
          >
            <Ionicons name="scan-outline" size={28} color="#fff" />
          </View>
          <Text
            style={{
              marginTop: 12,
              fontSize: text.xl2,
              fontWeight: "800",
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            uscan
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: 20, marginTop: -40, paddingBottom: 24 }}>
          <Card elevated style={{ padding: 22 }}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Logo size={24} />
              <Text className="mt-4 text-center text-xl font-medium text-ink">{title}</Text>
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

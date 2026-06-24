import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";
import { Logo } from "@/components/logo";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView className="flex-1">
        <View className="px-4 pb-10">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 pt-2">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-deep">
                <Text className="font-medium text-white">SS</Text>
              </View>
              <Logo size={22} />
            </View>
            <Ionicons name="notifications-outline" size={22} color={colors.muted} />
          </View>

          {/* Faza 0 holati */}
          <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text className="text-base font-medium text-ink">
                Faza 0 — Poydevor tayyor
              </Text>
            </View>
            <Text className="text-sm text-muted">
              Expo Router + NativeWind + Supabase ulandi. 5-tab navigatsiya ishlayapti.
            </Text>
          </View>

          {/* Supabase holati */}
          <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={isSupabaseConfigured ? "cloud-done-outline" : "cloud-offline-outline"}
                size={20}
                color={isSupabaseConfigured ? colors.success : colors.warning}
              />
              <Text className="text-sm text-ink">Supabase</Text>
            </View>
            <Text
              className="text-sm font-medium"
              style={{ color: isSupabaseConfigured ? colors.success : colors.warning }}
            >
              {isSupabaseConfigured ? "Ulandi" : ".env to'ldiring"}
            </Text>
          </View>

          {/* Namuna KPI (F6 da real ma'lumot) */}
          <Text className="mb-2 mt-1 text-base font-medium text-primary-deep">
            Namuna (keyin real ma'lumot)
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-line bg-surface p-4">
              <Text className="mb-1 text-xs text-muted">Bugungi savdo</Text>
              <Text className="text-lg font-medium text-primary-deep">
                {formatCurrency(245_000_000)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-line bg-surface p-4">
              <Text className="mb-1 text-xs text-muted">Sof foyda</Text>
              <Text className="text-lg font-medium text-success">
                {formatCurrency(38_000_000)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

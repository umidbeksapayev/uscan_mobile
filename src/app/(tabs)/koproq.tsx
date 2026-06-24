import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/auth-context";
import { useMemberships } from "@/features/auth/use-memberships";
import { colors } from "@/theme/colors";

const MENU: { icon: keyof typeof Ionicons.glyphMap; label: string; note: string }[] = [
  { icon: "book-outline", label: "Nasiya daftari", note: "F7" },
  { icon: "bar-chart-outline", label: "Hisobotlar", note: "F6" },
  { icon: "cube-outline", label: "Kirim / Ta'minotchi", note: "F7" },
  { icon: "pricetags-outline", label: "Kategoriyalar", note: "F8" },
  { icon: "settings-outline", label: "Sozlamalar", note: "F8" },
];

export default function KoproqScreen() {
  const { session } = useAuth();
  const { data: memberships } = useMemberships();
  const active = memberships?.[0];

  function logout() {
    Alert.alert("Chiqish", "Rostdan ham chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Chiqish", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView className="flex-1">
        <View className="px-4 pb-10">
          <Text className="pb-4 pt-2 text-2xl font-medium text-primary-deep">Ko'proq</Text>

          {/* Profil */}
          <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-deep">
              <Text className="text-base font-medium text-white">
                {(active?.shop.name ?? "u").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-ink">
                {active?.shop.name ?? "Do'kon"}
              </Text>
              <Text className="text-sm text-muted">{session?.user.email}</Text>
            </View>
            {active ? (
              <View className="rounded-full bg-primary-tint px-3 py-1">
                <Text className="text-xs font-medium text-primary">
                  {active.role === "owner" ? "Egasi" : "Kassir"}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Menyu (keyingi fazalarda to'ladi) */}
          <View className="mb-3 rounded-2xl border border-line bg-surface">
            {MENU.map((item, i) => (
              <View
                key={item.label}
                className={`flex-row items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <Ionicons name={item.icon} size={20} color={colors.primary} />
                <Text className="flex-1 text-base text-ink">{item.label}</Text>
                <Text className="text-xs text-muted">{item.note}</Text>
              </View>
            ))}
          </View>

          {/* Chiqish */}
          <Pressable
            onPress={logout}
            className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text className="text-base font-medium text-danger">Chiqish</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

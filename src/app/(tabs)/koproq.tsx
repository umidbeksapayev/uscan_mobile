import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/auth-context";
import {
  useMemberships,
  useActiveMembership,
  useActivePermissions,
} from "@/features/auth/use-memberships";
import { useActiveShopStore } from "@/features/auth/active-shop-store";
import { ShopSwitcherSheet } from "@/features/auth/shop-switcher-sheet";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { colors } from "@/theme/colors";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Tayyor bo'lsa — bosilganda shu route'ga o'tadi. */
  route?: Href;
  /** Hali tayyor emas bo'lsa — qaysi fazada chiqishi. */
  note?: string;
  /** manage_debt ruxsati shart (yo'q bo'lsa menyuda ko'rinmaydi). */
  debtGated?: boolean;
  /** purchase ruxsati shart (yo'q bo'lsa menyuda ko'rinmaydi). */
  purchaseGated?: boolean;
  /** manage_products ruxsati shart (yo'q bo'lsa menyuda ko'rinmaydi). */
  productsGated?: boolean;
};

const MENU: MenuItem[] = [
  { icon: "stats-chart-outline", label: "Statistika", route: "/statistika" }, // F6 — to'liq tahlil
  { icon: "book-outline", label: "Nasiya daftari", route: "/nasiya", debtGated: true }, // F7a
  { icon: "cube-outline", label: "Kirim / Ta'minotchi", route: "/supply", purchaseGated: true }, // F7b
  { icon: "pricetags-outline", label: "Kategoriyalar", route: "/categories", productsGated: true }, // F8
  { icon: "cloud-upload-outline", label: "Mahsulot import (CSV)", route: "/import-products", productsGated: true }, // Sprint 4
  { icon: "settings-outline", label: "Sozlamalar", route: "/settings" }, // F8
];

export default function KoproqScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: memberships } = useMemberships();
  const active = useActiveMembership();
  const setActiveShopId = useActiveShopStore((s) => s.setActiveShopId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { canManageDebt, canPurchase, canManageProducts } = useActivePermissions();
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const canSwitchShop = (memberships?.length ?? 0) > 1;
  // Ruxsatga qarab gate qilingan bandlarni yashiramiz
  const menu = MENU.filter(
    (m) =>
      (!m.debtGated || canManageDebt) &&
      (!m.purchaseGated || canPurchase) &&
      (!m.productsGated || canManageProducts),
  );

  function onItem(item: MenuItem) {
    if (item.route) {
      router.navigate(item.route);
    } else {
      toast.info(item.label, `Bu bo'lim ${item.note ?? "keyingi"} bosqichida tayyor bo'ladi.`);
    }
  }

  function onProfilePress() {
    if (canSwitchShop) {
      setSwitcherOpen(true);
    } else {
      toast.info(
        "Faqat bitta do'kon",
        "Hozircha faqat bitta do'konga a'zosiz. Boshqa do'konga ham a'zo bo'lsangiz, shu yerdan almashtira olasiz.",
      );
    }
  }

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

          {/* Profil — bosilganda ko'p do'konda almashtirish oynasi, bitta
              do'konda tushuntiruvchi xabar chiqadi (har doim bosiladigan) */}
          <Pressable
            onPress={onProfilePress}
            android_ripple={{ color: colors.line }}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
          >
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
            <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
          </Pressable>

          {/* Yuborilmagan sotuvlar (offline navbat) */}
          {pendingCount > 0 ? (
            <Pressable
              onPress={() => router.navigate("/offline-sales" as Href)}
              className="mb-3 flex-row items-center gap-3 rounded-2xl border p-4"
              style={{ borderColor: colors.warning, backgroundColor: "#FEF6E7" }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
              <Text className="flex-1 text-base font-medium text-ink">Yuborilmagan sotuvlar</Text>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.warning }}>
                <Text className="text-xs font-bold text-white">{pendingCount}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
            </Pressable>
          ) : null}

          {/* Menyu */}
          <View className="mb-3 rounded-2xl border border-line bg-surface">
            {menu.map((item, i) => {
              const ready = !!item.route;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => onItem(item)}
                  android_ripple={{ color: colors.line }}
                  className={`flex-row items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
                  style={{ opacity: ready ? 1 : 0.55 }}
                >
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                  <Text className="flex-1 text-base text-ink">{item.label}</Text>
                  {ready ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
                  ) : (
                    <View className="rounded-full bg-bg px-2 py-0.5">
                      <Text className="text-xs text-muted">{item.note}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
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

      <ShopSwitcherSheet
        visible={switcherOpen}
        memberships={memberships ?? []}
        activeShopId={active?.shop.id}
        onSelect={setActiveShopId}
        onClose={() => setSwitcherOpen(false)}
      />
    </SafeAreaView>
  );
}

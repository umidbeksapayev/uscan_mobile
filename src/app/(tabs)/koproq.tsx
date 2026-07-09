import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

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
  labelKey: string;
  route?: Href;
  note?: string;
  debtGated?: boolean;
  purchaseGated?: boolean;
  productsGated?: boolean;
  ownerGated?: boolean;
  tintBg: string;
  tintColor: string;
};

const MENU_FINANCE: MenuItem[] = [
  { icon: "stats-chart", labelKey: "menu.stats", route: "/statistika", tintBg: "rgba(59, 130, 246, 0.12)", tintColor: "#2563eb" },
  { icon: "calculator", labelKey: "menu.shiftClose", route: "/shift-close", tintBg: "rgba(16, 185, 129, 0.12)", tintColor: "#059669" },
  { icon: "wallet", labelKey: "menu.expenses", route: "/expenses", ownerGated: true, tintBg: "rgba(244, 63, 94, 0.12)", tintColor: "#e11d48" },
];

const MENU_INVENTORY: MenuItem[] = [
  { icon: "book", labelKey: "menu.debtBook", route: "/nasiya", debtGated: true, tintBg: "rgba(245, 158, 11, 0.12)", tintColor: "#d97706" },
  { icon: "cube", labelKey: "menu.supply", route: "/supply", purchaseGated: true, tintBg: "rgba(168, 85, 247, 0.12)", tintColor: "#9333ea" },
  { icon: "pricetags", labelKey: "category.manageTitle", route: "/categories", productsGated: true, tintBg: "rgba(99, 102, 241, 0.12)", tintColor: "#4f46e5" },
  { icon: "cloud-upload", labelKey: "menu.importCsv", route: "/import-products", productsGated: true, tintBg: "rgba(6, 182, 212, 0.12)", tintColor: "#0891b2" },
];

const MENU_SYSTEM: MenuItem[] = [
  { icon: "settings", labelKey: "settings.title", route: "/settings", tintBg: "rgba(100, 116, 139, 0.14)", tintColor: "#475569" },
];

export default function KoproqScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: memberships } = useMemberships();
  const active = useActiveMembership();
  const setActiveShopId = useActiveShopStore((s) => s.setActiveShopId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { canManageDebt, canPurchase, canManageProducts, isOwner } = useActivePermissions();
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const canSwitchShop = (memberships?.length ?? 0) > 1;

  function filterMenu(items: MenuItem[]) {
    return items.filter(
      (m) =>
        (!m.debtGated || canManageDebt) &&
        (!m.purchaseGated || canPurchase) &&
        (!m.productsGated || canManageProducts) &&
        (!m.ownerGated || isOwner),
    );
  }

  const financeGroup = filterMenu(MENU_FINANCE);
  const inventoryGroup = filterMenu(MENU_INVENTORY);
  const systemGroup = filterMenu(MENU_SYSTEM);

  function onItem(item: MenuItem) {
    if (item.route) {
      router.navigate(item.route);
    } else {
      toast.info(t(item.labelKey), `Bu bo'lim ${item.note ?? "keyingi"} bosqichida tayyor bo'ladi.`);
    }
  }

  function onProfilePress() {
    if (canSwitchShop) {
      setSwitcherOpen(true);
    } else {
      toast.info(t("menu.oneShopTitle"), t("menu.oneShopDesc"));
    }
  }

  function logout() {
    Alert.alert(t("nav.logout"), t("menu.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("nav.logout"), style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  function renderGroup(title: string, items: MenuItem[]) {
    if (items.length === 0) return null;
    return (
      <View className="mb-5">
        <Text className="mb-2 ml-1 text-xs font-semibold text-muted" style={{ letterSpacing: 0.6 }}>
          {title.toUpperCase()}
        </Text>
        <View className="rounded-[22px] border border-line bg-surface overflow-hidden shadow-2xs">
          {items.map((item, i) => {
            const ready = !!item.route;
            return (
              <Pressable
                key={item.labelKey}
                onPress={() => onItem(item)}
                android_ripple={{ color: colors.line }}
                className={`flex-row items-center gap-3.5 p-4 ${i > 0 ? "border-t border-line/60" : ""}`}
                style={{ opacity: ready ? 1 : 0.6 }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: item.tintBg }}
                >
                  <Ionicons name={item.icon} size={21} color={item.tintColor} />
                </View>
                <Text className="flex-1 text-base font-medium text-ink">{t(item.labelKey)}</Text>
                {ready ? (
                  <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
                ) : (
                  <View className="rounded-full bg-bg px-2.5 py-0.5 border border-line">
                    <Text className="text-xs text-muted">{item.note}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-3 pb-12">
          <Text className="pb-4 text-2xl font-bold text-ink">{t("nav.more")}</Text>

          {/* Profil banneri */}
          <Pressable
            onPress={onProfilePress}
            android_ripple={{ color: colors.line }}
            className="mb-6 flex-row items-center gap-3.5 rounded-[24px] border border-line bg-surface p-4 shadow-2xs"
          >
            <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-primary-deep shadow-xs">
              <Text className="text-xl font-bold text-white">
                {(active?.shop.name ?? "u").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-lg font-bold text-ink" numberOfLines={1}>
                {active?.shop.name ?? "Do'kon"}
              </Text>
              <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                {session?.user.email}
              </Text>
            </View>
            {active ? (
              <View className="rounded-xl bg-primary-tint px-3 py-1.5">
                <Text className="text-xs font-bold text-primary">
                  {active.role === "owner" ? t("staff.owner") : t("staff.cashier")}
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
          </Pressable>

          {/* Yuborilmagan sotuvlar (offline navbat) */}
          {pendingCount > 0 ? (
            <Pressable
              onPress={() => router.navigate("/offline-sales" as Href)}
              className="mb-6 flex-row items-center gap-3 rounded-[22px] border p-4 shadow-2xs"
              style={{ borderColor: colors.warning, backgroundColor: "#FEF6E7" }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
                <Ionicons name="cloud-upload" size={20} color={colors.warning} />
              </View>
              <Text className="flex-1 text-base font-semibold text-ink">{t("menu.unsyncedSales")}</Text>
              <View className="rounded-full px-2.5 py-1 shadow-2xs" style={{ backgroundColor: colors.warning }}>
                <Text className="text-xs font-bold text-white">{pendingCount}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
            </Pressable>
          ) : null}

          {/* Menyu guruhlari */}
          {renderGroup("Moliya va Tahlil", financeGroup)}
          {renderGroup("Ombor va Nasiya", inventoryGroup)}
          {renderGroup("Tizim", systemGroup)}

          {/* Chiqish tugmasi */}
          <Pressable
            onPress={logout}
            android_ripple={{ color: "rgba(239, 68, 68, 0.1)" }}
            className="mt-2 flex-row items-center justify-center gap-2.5 rounded-[20px] border border-danger/30 bg-danger/5 py-4 shadow-2xs"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text className="text-base font-semibold text-danger">{t("nav.logout")}</Text>
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

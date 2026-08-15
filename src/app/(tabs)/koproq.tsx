import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import {
  useMemberships,
  useActiveMembership,
  useActivePermissions,
} from "@/features/auth/use-memberships";
import { useActiveShopStore } from "@/features/auth/active-shop-store";
import { useIsSuperAdmin } from "@/features/billing/use-payments";
import { unregisterPushToken } from "@/features/notifications/notify";
import { ShopSwitcherSheet } from "@/features/auth/shop-switcher-sheet";
import { PlanBadge } from "@/features/billing/plan-badge";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { useColors } from "@/theme/theme-store";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  /** i18n kaliti (label render paytida t() bilan olinadi). */
  labelKey: string;
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
  /** Faqat egasi (yo'q bo'lsa menyuda ko'rinmaydi). */
  ownerGated?: boolean;
  /** Faqat kassir (ega bo'lsa menyuda ko'rinmaydi) — `ownerGated`ning teskarisi. */
  cashierOnly?: boolean;
  /** Faqat super_admin (`profiles.role`) — to'lovlarni tekshirish paneli. */
  adminOnly?: boolean;
  /** O'ng tomonda joriy tarif nishoni (chevrondan oldin). */
  showPlanBadge?: boolean;
};

const MENU: MenuItem[] = [
  // Profil — tepadagi karta ham shu yerga olib boradi; menyuda ham turadi,
  // chunki foydalanuvchilarning bir qismi kartani "sarlavha" deb o'qiydi.
  { icon: "person-circle-outline", labelKey: "profile.title", route: "/profile" as Href },
  // AI yordamchi — faqat egasi (server ham `is_shop_owner` bilan majburlaydi).
  // `as Href` — typed-routes tiplari `expo start` da qayta generatsiya bo'ladi
  // (`/offline-sales` da ham shu naqsh).
  {
    icon: "sparkles-outline",
    labelKey: "ai.menuLabel",
    route: "/ai-chat" as Href,
    ownerGated: true,
  },
  { icon: "stats-chart-outline", labelKey: "menu.stats", route: "/statistika" },
  // "Kassirlar" — egada xodim boshqaruvi + hisobot (staff.tsx), kassirda
  // to'g'ridan-to'g'ri o'z hisoboti (server, migration 033, faqat o'z
  // natijasini beradi). Ikkalasi ham bir xil labelKey — foydalanuvchiga
  // bitta tugma bo'lib ko'rinadi, faqat manzili rolga qarab farqlanadi.
  { icon: "people-outline", labelKey: "settings.sectionCashiers", route: "/staff" as Href, ownerGated: true },
  { icon: "people-outline", labelKey: "settings.sectionCashiers", route: "/cashier-report", cashierOnly: true },
  { icon: "calculator-outline", labelKey: "menu.shiftClose", route: "/shift-close" },
  { icon: "wallet-outline", labelKey: "menu.expenses", route: "/expenses", ownerGated: true },
  { icon: "book-outline", labelKey: "menu.debtBook", route: "/nasiya", debtGated: true },
  { icon: "cube-outline", labelKey: "menu.supply", route: "/supply", purchaseGated: true },
  { icon: "pricetags-outline", labelKey: "category.manageTitle", route: "/categories", productsGated: true },
  { icon: "cloud-upload-outline", labelKey: "menu.importCsv", route: "/import-products", productsGated: true },
  // Obuna/tarif — faqat egasi ko'radi (to'lov/limit qarori kassirga tegishli emas).
  {
    icon: "card-outline",
    labelKey: "billing.title",
    route: "/subscription" as Href,
    ownerGated: true,
    showPlanBadge: true,
  },
  // To'lovlarni tekshirish — faqat super_admin (045-migratsiya). Server ham
  // `is_super_admin()` bilan majburlaydi, bu faqat menyuni yashirish.
  {
    icon: "shield-checkmark-outline",
    labelKey: "billing.adminTitle",
    route: "/admin-payments" as Href,
    adminOnly: true,
  },
  { icon: "settings-outline", labelKey: "settings.title", route: "/settings" },
];

export default function KoproqScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const { data: memberships } = useMemberships();
  const active = useActiveMembership();
  const setActiveShopId = useActiveShopStore((s) => s.setActiveShopId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { canManageDebt, canPurchase, canManageProducts, isOwner } = useActivePermissions();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const canSwitchShop = (memberships?.length ?? 0) > 1;
  // Ruxsatga qarab gate qilingan bandlarni yashiramiz
  const menu = MENU.filter(
    (m) =>
      (!m.debtGated || canManageDebt) &&
      (!m.purchaseGated || canPurchase) &&
      (!m.productsGated || canManageProducts) &&
      (!m.ownerGated || isOwner) &&
      (!m.cashierOnly || !isOwner) &&
      (!m.adminOnly || !!isSuperAdmin),
  );

  function onItem(item: MenuItem) {
    if (item.route) {
      router.navigate(item.route);
    } else {
      toast.info(t(item.labelKey), `Bu bo'lim ${item.note ?? "keyingi"} bosqichida tayyor bo'ladi.`);
    }
  }

  function onShopPress() {
    if (canSwitchShop) {
      setSwitcherOpen(true);
    } else {
      toast.info(t("menu.oneShopTitle"), t("menu.oneShopDesc"));
    }
  }

  function logout() {
    Alert.alert(t("nav.logout"), t("menu.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nav.logout"),
        style: "destructive",
        // Tokenni AVVAL o'chiramiz — signOut'dan keyin RLS `auth.uid()` yo'q
        // bo'ladi va o'chirish qatorga tegmay qolardi (telefonni boshqa
        // foydalanuvchiga bergan ega begona do'kon xulosasini olishda davom etardi).
        // `scope: "local"` — server bilan tarmoq orqali gaplashmasdan FAQAT
        // lokal sessiyani tozalaydi (sekin tarmoqda logout tugmasi
        // daqiqalab osilib qolmasin, `unregisterPushToken` ham endi 8s
        // muhlat bilan — ikkalasi ham `lib/with-timeout.ts`).
        onPress: async () => {
          await unregisterPushToken();
          await supabase.auth.signOut({ scope: "local" });
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView className="flex-1">
        <View className="px-4 pb-10">
          <Text className="pb-4 pt-2 text-2xl font-medium text-heading">{t("nav.more")}</Text>

          {/* Foydalanuvchi kartasi ATAYLAB yo'q: u menyudagi "Profil" qatori
              bilan aynan bir joyga olib borardi — bitta ekranda ikkita bir xil
              yo'l. Ism/email/rasm profil ekranining o'zida. */}

          {/* Do'kon — ko'p do'konda almashtirish oynasi, bitta do'konda
              tushuntiruvchi xabar (har doim bosiladigan, avvalgidek) */}
          <Pressable
            onPress={onShopPress}
            android_ripple={{ color: colors.line }}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <Ionicons name="storefront-outline" size={20} color={colors.primary} />
            <View className="flex-1">
              <Text className="text-base font-medium text-ink" numberOfLines={1}>
                {active?.shop.name ?? t("menu.shop")}
              </Text>
              {canSwitchShop ? (
                <Text className="text-sm text-muted">{t("menu.switchShop")}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
          </Pressable>

          {/* Alohida "Tarif" kartasi ATAYLAB yo'q: u menyudagi "Tarif" qatori
              bilan aynan bir joyga olib borardi. Karta faqat tarif NISHONINI
              qo'shimcha ko'rsatardi — endi nishon menyu qatorining o'zida
              (`showPlanBadge`), ya'ni ma'lumot yo'qolmadi, takror ketdi. */}

          {/* Yuborilmagan sotuvlar (offline navbat) */}
          {pendingCount > 0 ? (
            <Pressable
              onPress={() => router.navigate("/offline-sales" as Href)}
              className="mb-3 flex-row items-center gap-3 rounded-2xl border p-4"
              style={{ borderColor: colors.warning, backgroundColor: colors.warningTint }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
              <Text className="flex-1 text-base font-medium text-ink">{t("menu.unsyncedSales")}</Text>
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
                  key={item.labelKey}
                  onPress={() => onItem(item)}
                  android_ripple={{ color: colors.line }}
                  className={`flex-row items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
                  style={{ opacity: ready ? 1 : 0.55 }}
                >
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                  <Text className="flex-1 text-base text-ink">{t(item.labelKey)}</Text>
                  {item.showPlanBadge ? <PlanBadge /> : null}
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
            <Text className="text-base font-medium text-danger">{t("nav.logout")}</Text>
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

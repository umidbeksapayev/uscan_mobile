import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useColors } from "@/theme/theme-store";
import { shadowNav, shadowGlow } from "@/theme/shadows";
import { PressableScale } from "@/components/ui/pressable-scale";
import { LogoMark } from "@/components/logo";
import { QueueBadge } from "./queue-badge";
import { radius, text } from "@/theme/tokens";

/**
 * Markaziy ko'tarilgan tugma — `sotuv` tabi, lekin KONTEKSTGA qarab
 * ikki xil ishlaydi:
 *
 *  - boshqa ekranda turgan bo'lsak → Sotuv ekranini ochadi (oddiy tab);
 *  - allaqachon Sotuv ekranida bo'lsak → SKANER ochiladi.
 *
 * Ya'ni istalgan joydan ikki bosishda kamera, savatga esa doim bir bosishda.
 * Tugma faqat skaner qilib qo'yilsa savatni skanersiz ochish yo'li
 * qolmasdi (to'lovga o'tish, Tezkor narx, qidiruv orqali qo'shish).
 */
const CENTER_ROUTE = "sotuv";

/** `sotuv` bu yerda YO'Q — u markaziy tugma, o'z belgisini o'zi chizadi. */
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  katalog: "grid-outline",
  tarix: "receipt-outline",
  koproq: "menu-outline",
};

/**
 * Faol holatdagi TO'LDIRILGAN variant. Faqat rang o'zgarishi yetarli emas:
 * ko'k va kulrang outline ikonka kichik o'lchamda deyarli bir xil ko'rinadi,
 * to'ldirilgan shakl esa bir qarashda ajralib turadi (rangga bog'liq emas).
 */
const ICONS_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  katalog: "grid",
  tarix: "receipt",
  koproq: "menu",
};

/** Markaziy tugma o'lchamlari — panel balandligi bilan bog'liq. */
const BAR_HEIGHT = 64;
const FAB_SIZE = 64;
/** Tugma paneldan shuncha piksel yuqoriga chiqadi. */
const FAB_LIFT = 20;

/**
 * Floating, yumaloq pastki navigatsiya (safe-area inset bilan).
 *
 * Markazdagi "Sotuv" — ko'tarilgan to'ldirilgan tugma: ilovada eng ko'p
 * bosiladigan tugma qolgan to'rttasi bilan bir xil ko'rinishda edi.
 * Yozuvi ATAYLAB yo'q (shakl o'zi yetarlicha ajralib turadi), lekin
 * `accessibilityLabel` bor — ekran o'quvchi uchun ma'lumot yo'qolmaydi.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: 14,
        // Ko'tarilgan tugma va uning soyasi ota-ona chegarasi ICHIDA qolishi
        // kerak — Android `elevation`ni chegaradan tashqarida kesib tashlaydi.
        paddingTop: FAB_LIFT + 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        className="flex-row items-center rounded-3xl border border-line bg-surface"
        style={{
          height: BAR_HEIGHT,
          ...shadowNav(colors.shadow),
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          /* ── Markaziy tugma ─────────────────────────────────────────── */
          if (route.name === CENTER_ROUTE) {
            // Ko'tarilish TASHQI View'da: `PressableScale` o'z
            // `transform: [{ scale }]` ini `style` USTIGA qo'yadi, ya'ni
            // ichkariga yozilgan `translateY` jimgina yo'qolardi (RN style
            // massivida keyingi `transform` avvalgisini butunlay almashtiradi).
            return (
              <View
                key={route.key}
                style={{ flex: 1, alignItems: "center", transform: [{ translateY: -FAB_LIFT }] }}
              >
                <PressableScale
                  // Sotuv ekranida turgan bo'lsak — kamera; aks holda
                  // oddiy tab o'tishi (`onPress` yuqorida hisoblangan).
                  onPress={focused ? () => router.push("/scanner") : onPress}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={focused ? t("barcode.scanBtn") : label}
                  style={{
                    width: FAB_SIZE,
                    height: FAB_SIZE,
                    borderRadius: radius.xl,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    // Chegara `bg` rangida — tugma panelni "teshib chiqqan"
                    // bo'lib ko'rinadi (panelga o'yiq kesish shart emas).
                    borderWidth: 4,
                    borderColor: colors.bg,
                    ...shadowGlow(colors.primary),
                  }}
                >
                  {/* Brend belgisi — u aynan skaner kadri, ya'ni "skanerlash"
                      va "uscan" bitta shaklda. Alohida QR ikonkasi qo'yilsa
                      ilovada yana ikkita boshqa-boshqa belgi paydo bo'lardi. */}
                  <LogoMark size={30} tone="onDark" />
                </PressableScale>
              </View>
            );
          }

          /* ── Oddiy tugmalar ─────────────────────────────────────────── */
          const color = focused ? colors.primary : colors.tabInactive;
          const icon = focused
            ? (ICONS_ACTIVE[route.name] ?? "ellipse")
            : (ICONS[route.name] ?? "ellipse-outline");

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              className="flex-1 items-center justify-center"
              style={{ gap: 3 }}
            >
              <View>
                <Ionicons name={icon} size={22} color={color} />
                {route.name === "koproq" ? <QueueBadge size={16} /> : null}
              </View>
              <Text style={{ fontSize: text.xs, color, fontWeight: focused ? "500" : "400" }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

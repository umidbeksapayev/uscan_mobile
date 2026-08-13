import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useColors } from "@/theme/theme-store";
import { shadowNav } from "@/theme/shadows";
import { QueueBadge } from "./queue-badge";
import { text } from "@/theme/tokens";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  katalog: "grid-outline",
  sotuv: "cart-outline",
  tarix: "receipt-outline",
  koproq: "menu-outline",
};

/** Floating, yumaloq pastki navigatsiya (safe-area inset bilan). */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        className="flex-row items-center rounded-3xl border border-line bg-surface"
        style={{
          height: 62,
          ...shadowNav(colors.shadow),
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.tabInactive;
          const icon = ICONS[route.name] ?? "ellipse-outline";

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

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-center"
              style={{ gap: 3 }}
            >
              <View>
                <Ionicons name={icon} size={22} color={color} />
                {route.name === "koproq" ? <QueueBadge size={16} /> : null}
              </View>
              <Text
                style={{ fontSize: text.xs, color, fontWeight: focused ? "500" : "400" }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

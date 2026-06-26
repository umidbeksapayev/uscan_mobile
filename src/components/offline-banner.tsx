import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { useOnline } from "@/lib/use-online";

/**
 * Internetsiz rejim banneri — eng tepada (auth-gate ichida, Stack ustida).
 * Faqat offline'da ko'rinadi.
 */
export function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View style={{ backgroundColor: colors.warning, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-center gap-2 px-3 py-1.5">
        <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
        <Text className="text-xs font-medium text-white">
          Internetsiz rejim — sotuvlar saqlanib, ulanganda yuboriladi
        </Text>
      </View>
    </View>
  );
}

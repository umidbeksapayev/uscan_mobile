import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  note: string;
};

/** F1+ da real ekran bilan almashtiriladigan brendlangan placeholder. */
export function ScreenPlaceholder({ title, icon, note }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-2xl font-medium text-primary-deep">{title}</Text>
      </View>
      <View className="flex-1 items-center justify-center px-10">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
          <Ionicons name={icon} size={36} color={colors.primary} />
        </View>
        <Text className="text-center text-base text-muted">{note}</Text>
      </View>
    </SafeAreaView>
  );
}

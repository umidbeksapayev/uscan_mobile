import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Membership } from "@/types/database";

export function ShopSwitcherSheet({
  visible,
  memberships,
  activeShopId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  memberships: Membership[];
  activeShopId: string | undefined;
  onSelect: (shopId: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
          <Text className="mb-2 text-lg font-medium text-ink">Do'konni tanlang</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {memberships.map((m) => {
              const active = activeShopId === m.shop.id;
              return (
                <Pressable
                  key={m.shop.id}
                  onPress={() => {
                    onSelect(m.shop.id);
                    onClose();
                  }}
                  className="flex-row items-center gap-3 px-1"
                  style={{ height: 60 }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-deep">
                    <Text className="text-sm font-medium text-white">
                      {m.shop.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{ color: active ? colors.primary : colors.ink, fontWeight: active ? "500" : "400" }}
                    >
                      {m.shop.name}
                    </Text>
                    <Text className="text-xs text-muted">
                      {m.role === "owner" ? "Egasi" : "Kassir"}
                    </Text>
                  </View>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
    </BottomSheet>
  );
}

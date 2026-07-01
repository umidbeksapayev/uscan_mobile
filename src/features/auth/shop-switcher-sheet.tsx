import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              marginBottom: 12,
            }}
          />
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
        </View>
      </Pressable>
    </Modal>
  );
}

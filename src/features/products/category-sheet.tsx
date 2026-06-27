import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import type { Category } from "@/types/database";

export function CategorySheet({
  visible,
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const options: { id: string | null; name: string }[] = [
    { id: null, name: "Kategoriyasiz" },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];
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
          <Text className="mb-2 text-lg font-medium text-ink">Kategoriya</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((o) => {
              const active = selectedId === o.id;
              return (
                <Pressable
                  key={o.id ?? "none"}
                  onPress={() => {
                    onSelect(o.id);
                    onClose();
                  }}
                  className="flex-row items-center justify-between px-1"
                  style={{ height: 52 }}
                >
                  <Text
                    className="text-base"
                    style={{ color: active ? colors.primary : colors.ink, fontWeight: active ? "500" : "400" }}
                  >
                    {o.name}
                  </Text>
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

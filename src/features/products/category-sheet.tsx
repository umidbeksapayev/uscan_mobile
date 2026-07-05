import { Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
    <BottomSheet visible={visible} onClose={onClose}>
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
    </BottomSheet>
  );
}

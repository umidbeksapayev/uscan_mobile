import { Text } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { BottomSheet, SheetPressable } from "@/components/ui/bottom-sheet";
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
  const { t } = useTranslation();
  const options: { id: string | null; name: string }[] = [
    { id: null, name: t("product.noCategory") },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose}>
          <Text className="mb-2 text-lg font-medium text-ink">{t("product.category")}</Text>
          <BottomSheetScrollView style={{ maxHeight: 380 }}>
            {options.map((o) => {
              const active = selectedId === o.id;
              return (
                <SheetPressable
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
                </SheetPressable>
              );
            })}
          </BottomSheetScrollView>
    </BottomSheet>
  );
}

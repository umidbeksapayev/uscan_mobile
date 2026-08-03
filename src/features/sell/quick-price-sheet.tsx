import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { BottomSheet, SheetPressable } from "@/components/ui/bottom-sheet";

const PRESETS = [5000, 10000, 20000];

type Props = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

/**
 * Shtrix-kodsiz/katalogsiz tovar uchun tezkor narx kiritish (P9).
 * Faqat `manage_products` ruxsati bor foydalanuvchiga ochiq — sabab
 * `features/sell/misc-product.ts`da.
 */
export function QuickPriceSheet({ visible, loading, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const amount = parseFloat(text.replace(/\s/g, "").replace(",", ".")) || 0;
  const valid = amount > 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding>
            <Text className="text-lg font-medium text-ink">{t("sell.quickPrice")}</Text>
            <Text className="text-sm text-muted">{t("sell.quickPriceDesc")}</Text>

            <BottomSheetTextInput
              value={text}
              onChangeText={setText}
              keyboardType="number-pad"
              placeholder={t("common.example", { v: "15000" })}
              placeholderTextColor={colors.tabInactive}
              autoFocus
              className="mt-4 rounded-2xl border border-line bg-bg px-4 text-2xl font-medium text-ink"
              style={{ height: 60 }}
            />

            <View className="mt-3 flex-row gap-2">
              {PRESETS.map((p) => (
                <SheetPressable
                  key={p}
                  onPress={() => setText(String(p))}
                  className="flex-1 items-center justify-center rounded-xl bg-bg"
                  style={{ height: 44 }}
                >
                  <Text className="text-sm font-medium text-ink">{formatCurrency(p)}</Text>
                </SheetPressable>
              ))}
            </View>

            <SheetPressable
              disabled={!valid || loading}
              onPress={() => onConfirm(amount)}
              className="mt-6 flex-row items-center justify-center rounded-2xl bg-primary"
              style={{ height: 54, opacity: valid && !loading ? 1 : 0.5 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-medium text-white">
                  {t("addToCart.addToCart")}
                  {valid ? ` · ${formatCurrency(amount)}` : ""}
                </Text>
              )}
            </SheetPressable>
    </BottomSheet>
  );
}

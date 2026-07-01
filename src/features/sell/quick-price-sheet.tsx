import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";

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
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const amount = parseFloat(text.replace(/\s/g, "").replace(",", ".")) || 0;
  const valid = amount > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
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
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.line,
                marginBottom: 16,
              }}
            />

            <Text className="text-lg font-medium text-ink">Tezkor narx</Text>
            <Text className="text-sm text-muted">
              Shtrix-kodsiz yoki katalogda yo'q tovar uchun narxni kiriting
            </Text>

            <TextInput
              value={text}
              onChangeText={setText}
              keyboardType="number-pad"
              placeholder="Masalan: 15000"
              placeholderTextColor={colors.tabInactive}
              autoFocus
              className="mt-4 rounded-2xl border border-line bg-bg px-4 text-2xl font-medium text-ink"
              style={{ height: 60 }}
            />

            <View className="mt-3 flex-row gap-2">
              {PRESETS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setText(String(p))}
                  className="flex-1 items-center justify-center rounded-xl bg-bg"
                  style={{ height: 44 }}
                >
                  <Text className="text-sm font-medium text-ink">{formatCurrency(p)}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              disabled={!valid || loading}
              onPress={() => onConfirm(amount)}
              className="mt-6 flex-row items-center justify-center rounded-2xl bg-primary"
              style={{ height: 54, opacity: valid && !loading ? 1 : 0.5 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-medium text-white">
                  Savatga qo'shish{valid ? ` · ${formatCurrency(amount)}` : ""}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

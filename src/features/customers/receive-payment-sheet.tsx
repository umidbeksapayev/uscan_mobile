import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { colors } from "@/theme/colors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useRecordPayment } from "./use-customers";

type Props = {
  visible: boolean;
  shopId: string;
  customerId: string;
  /** Joriy qarz (musbat = qarzdor) — "Hammasi" tugmasi va validatsiya uchun. */
  currentBalance: number;
  onClose: () => void;
};

/** Qarz to'lovini qabul qilish (record_customer_payment, optimistik). */
export function ReceivePaymentSheet({ visible, shopId, customerId, currentBalance, onClose }: Props) {
  const [text, setText] = useState("");
  const mutation = useRecordPayment(customerId);

  useEffect(() => {
    if (visible) {
      setText("");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const amount = parseFloat(text.replace(/\s/g, "")) || 0;
  const canSubmit = amount > 0 && !mutation.isPending;
  const maxDebt = Math.max(0, currentBalance);

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ shopId, customerId, amount });
      onClose();
    } catch {
      // mutation.isError UI'da
    }
  }

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
            style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }}
          />
          <Text className="mb-1 text-lg font-medium text-ink">To'lov qabul qilish</Text>
          <Text className="mb-3 text-sm text-muted">Joriy qarz: {formatCurrency(maxDebt)}</Text>

          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.tabInactive}
            className="rounded-2xl border border-line bg-bg px-4 text-2xl font-semibold text-ink"
            style={{ height: 60 }}
            autoFocus
          />
          {maxDebt > 0 ? (
            <Pressable
              onPress={() => setText(String(maxDebt))}
              className="mt-2 self-start rounded-xl bg-bg px-4 py-2"
              style={{ borderWidth: 1, borderColor: colors.line }}
            >
              <Text className="text-sm font-medium text-ink">Hammasi ({formatNumber(maxDebt)})</Text>
            </Pressable>
          ) : null}

          {mutation.isError ? (
            <Text className="mt-3 text-center text-sm text-danger">
              {(mutation.error as Error)?.message ?? "Xatolik"}
            </Text>
          ) : null}

          <Pressable
            disabled={!canSubmit}
            onPress={onSubmit}
            className="mt-4 flex-row items-center justify-center rounded-2xl bg-primary"
            style={{ height: 54, opacity: canSubmit ? 1 : 0.5 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Qabul qilish</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

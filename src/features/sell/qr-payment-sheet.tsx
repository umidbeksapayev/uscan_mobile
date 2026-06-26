import { Modal, View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { useQrPayment } from "./acquiring/use-qr-payment";
import { acquiringStatusUI } from "./acquiring/acquiring-status";
import type { SaleResult } from "./checkout";

type Props = {
  visible: boolean;
  shopId: string;
  items: { product_id: string; quantity: number }[];
  amount: number;
  clientId: string;
  onPaid: (res: SaleResult) => void;
  onClose: () => void;
};

/** QR/ekvayring to'lov oynasi — intent QR ko'rsatadi, holatni polling qiladi. */
export function QrPaymentSheet({ visible, shopId, items, amount, clientId, onPaid, onClose }: Props) {
  const { status, payUrl } = useQrPayment({ shopId, items, amount, clientId, enabled: visible, onPaid });
  const ui = acquiringStatusUI(status);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, paddingBottom: 28, alignItems: "center",
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />
          <Text className="mb-1 text-lg font-medium text-ink">QR orqali to'lov</Text>
          <Text className="mb-4 text-2xl font-bold" style={{ color: colors.primary }}>{formatCurrency(amount)}</Text>

          <View
            style={{
              width: 228, height: 228, alignItems: "center", justifyContent: "center",
              backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.line,
            }}
          >
            {payUrl ? <QRCode value={payUrl} size={200} /> : <ActivityIndicator color={colors.primary} />}
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            {status === "pending" ? (
              <ActivityIndicator color={ui.color} size="small" />
            ) : (
              <Ionicons name={ui.icon} size={20} color={ui.color} />
            )}
            <Text style={{ color: ui.color, fontWeight: "500", fontSize: 16 }}>{ui.label}</Text>
          </View>

          <Pressable
            onPress={onClose}
            className="mt-6 w-full items-center justify-center rounded-2xl bg-bg"
            style={{ height: 52, borderWidth: 1, borderColor: colors.line }}
          >
            <Text className="text-base font-medium text-muted">
              {status === "paid" ? "Yopish" : "Bekor qilish"}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/theme/colors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { uuidv4 } from "@/lib/uuid";
import { changeAmount } from "./payment-math";
import { processCartSale, type PaymentMethod } from "./checkout";
import type { CartItem } from "./cart-store";
import { useActivePermissions } from "@/features/auth/use-memberships";
import { CustomerPickerSheet, type PickedCustomer } from "@/features/customers/customer-picker-sheet";
import { debtFromSale } from "@/features/customers/debt-math";

const METHODS: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "cash", label: "Naqd", icon: "cash-outline" },
  { id: "card", label: "Karta", icon: "card-outline" },
  { id: "qr", label: "QR", icon: "qr-code-outline" },
  { id: "debt", label: "Nasiya", icon: "book-outline" },
];
const QUICK = [50000, 100000, 200000];

type Props = {
  visible: boolean;
  total: number;
  shopId?: string;
  items: CartItem[];
  onClose: () => void;
  onPaid: () => void;
};

export function PaymentSheet({ visible, total, shopId, items, onClose, onPaid }: Props) {
  const qc = useQueryClient();
  const { canManageDebt } = useActivePermissions();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [givenText, setGivenText] = useState("");
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [clientId, setClientId] = useState(uuidv4());
  // Nasiya holati (faqat method === "debt" da ishlatiladi)
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [debtPaidText, setDebtPaidText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const methods = canManageDebt ? METHODS : METHODS.filter((m) => m.id !== "debt");
  const debtPaid = parseFloat(debtPaidText.replace(/\s/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: () =>
      processCartSale({
        shopId: shopId as string,
        items,
        clientId,
        // Naqd/Karta/QR uchun null — mavjud oqim o'zgarmaydi
        customerId: method === "debt" ? customer?.id ?? null : null,
        paidAmount: method === "debt" ? debtPaid : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sell-search"] });
      onPaid(); // savatni tozalaydi (qayta sotuv oldini oladi)
      setPhase("success");
    },
  });

  useEffect(() => {
    if (visible) {
      setMethod("cash");
      setGivenText("");
      setPhase("form");
      setClientId(uuidv4());
      setCustomer(null);
      setDebtPaidText("");
      setPickerOpen(false);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const effectiveTotal = mutation.data?.total_revenue ?? total;
  const given = parseFloat(givenText.replace(/\s/g, "")) || 0;
  const change = changeAmount(given, effectiveTotal);
  const cashShort = method === "cash" && given > 0 && given < total;
  // Nasiya uchun mijoz tanlangan bo'lishi shart; Naqd/Karta/QR uchun avvalgidek
  const debtReady = method === "debt" ? !!customer : true;
  const canPay = !!shopId && items.length > 0 && debtReady && !mutation.isPending;

  const sheet = {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  } as const;

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Pressable
        onPress={phase === "form" ? onClose : undefined}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <View onStartShouldSetResponder={() => true} style={sheet}>
          {phase === "success" ? (
            <View className="items-center" style={{ paddingVertical: 8 }}>
              <View
                className="mb-4 h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "#E7F6EE" }}
              >
                <Ionicons name="checkmark" size={44} color={colors.success} />
              </View>
              <Text className="text-xl font-medium text-ink">Sotuv muvaffaqiyatli</Text>
              <Text className="mt-1 text-base text-muted">{formatCurrency(effectiveTotal)}</Text>
              {method === "cash" && change > 0 ? (
                <Text className="mt-1 text-base font-medium text-success">
                  Qaytim: {formatCurrency(change)}
                </Text>
              ) : null}
              {method === "debt" ? (
                <Text className="mt-1 text-base font-medium" style={{ color: "#B42318" }}>
                  Nasiyaga yozildi: {formatCurrency(debtFromSale(effectiveTotal, debtPaid))}
                </Text>
              ) : null}
              <Pressable
                onPress={onClose}
                className="mt-6 w-full flex-row items-center justify-center rounded-2xl bg-primary"
                style={{ height: 54 }}
              >
                <Text className="text-base font-medium text-white">Yangi sotuv</Text>
              </Pressable>
            </View>
          ) : (
            <>
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

              <Text className="text-center text-xs text-muted" style={{ letterSpacing: 0.5 }}>
                JAMI TO'LOV
              </Text>
              <Text className="mb-4 text-center text-3xl font-medium" style={{ color: colors.primary }}>
                {formatCurrency(total)}
              </Text>

              <Text className="mb-2 text-sm font-medium text-ink">To'lov turi</Text>
              <View className="mb-4 flex-row gap-2">
                {methods.map((m) => {
                  const active = method === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMethod(m.id)}
                      className="flex-1 items-center justify-center rounded-2xl"
                      style={{
                        height: 64,
                        backgroundColor: active ? colors.primary : colors.bg,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.line,
                      }}
                    >
                      <Ionicons name={m.icon} size={22} color={active ? "#fff" : colors.muted} />
                      <Text
                        style={{
                          fontSize: 12,
                          marginTop: 4,
                          fontWeight: "500",
                          color: active ? "#fff" : colors.muted,
                        }}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {method === "cash" ? (
                <View className="mb-4">
                  <Text className="mb-1 text-sm font-medium text-ink">Berilgan pul</Text>
                  <TextInput
                    value={givenText}
                    onChangeText={setGivenText}
                    keyboardType="number-pad"
                    placeholder={formatNumber(total)}
                    placeholderTextColor={colors.tabInactive}
                    className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                    style={{ height: 56 }}
                  />
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      onPress={() => setGivenText(String(total))}
                      className="flex-1 items-center justify-center rounded-xl bg-bg"
                      style={{ height: 40 }}
                    >
                      <Text className="text-sm font-medium text-ink">Aniq</Text>
                    </Pressable>
                    {QUICK.map((q) => (
                      <Pressable
                        key={q}
                        onPress={() => setGivenText(String(q))}
                        className="flex-1 items-center justify-center rounded-xl bg-bg"
                        style={{ height: 40 }}
                      >
                        <Text className="text-sm font-medium text-ink">{formatNumber(q)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {given > 0 ? (
                    <View
                      className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
                      style={{ backgroundColor: cashShort ? "#FDECEC" : "#E7F6EE" }}
                    >
                      <Text className="text-sm" style={{ color: cashShort ? "#B42318" : "#0F6E56" }}>
                        {cashShort ? "Yetishmadi" : "Qaytim"}
                      </Text>
                      <Text
                        className="text-base font-medium"
                        style={{ color: cashShort ? "#B42318" : "#0F6E56" }}
                      >
                        {formatCurrency(Math.abs(change))}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : method === "debt" ? (
                <View className="mb-4" style={{ gap: 10 }}>
                  {/* Mijoz tanlash */}
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center justify-between rounded-2xl border border-line bg-bg px-4"
                    style={{ height: 56 }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="person-outline" size={20} color={colors.primary} />
                      <Text className="text-base" style={{ color: customer ? colors.ink : colors.muted }}>
                        {customer ? customer.name : "Mijoz tanlang"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
                  </Pressable>

                  {/* To'langan summa (qisman to'lov; bo'sh = to'liq nasiya) */}
                  <View>
                    <Text className="mb-1 text-sm font-medium text-ink">To'langan summa (ixtiyoriy)</Text>
                    <TextInput
                      value={debtPaidText}
                      onChangeText={setDebtPaidText}
                      keyboardType="number-pad"
                      placeholder="0 — to'liq nasiya"
                      placeholderTextColor={colors.tabInactive}
                      className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                      style={{ height: 56 }}
                    />
                  </View>

                  {/* Qarz preview */}
                  <View
                    className="flex-row items-center justify-between rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "#FDECEC" }}
                  >
                    <Text className="text-sm" style={{ color: "#B42318" }}>Qarzga yoziladi</Text>
                    <Text className="text-base font-medium" style={{ color: "#B42318" }}>
                      {formatCurrency(debtFromSale(total, debtPaid))}
                    </Text>
                  </View>
                </View>
              ) : null}

              {mutation.isError ? (
                <Text className="mb-3 text-center text-sm text-danger">
                  {(mutation.error as Error)?.message ?? "Xatolik yuz berdi"}
                </Text>
              ) : null}

              <Pressable
                disabled={!canPay}
                onPress={() => mutation.mutate()}
                className="flex-row items-center justify-center rounded-2xl bg-primary"
                style={{ height: 54, opacity: canPay ? 1 : 0.5 }}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-medium text-white">To'lovni yakunlash</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>

    {shopId ? (
      <CustomerPickerSheet
        visible={pickerOpen}
        shopId={shopId}
        onSelect={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    ) : null}
    </>
  );
}

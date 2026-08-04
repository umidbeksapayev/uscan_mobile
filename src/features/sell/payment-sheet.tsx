import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { formatCurrency, formatNumber } from "@/lib/format";
import { uuidv4 } from "@/lib/uuid";
import { changeAmount } from "./payment-math";
import { submitSale, type PaymentMethod, type SaleResult } from "./checkout";
import type { CartItem } from "./cart-store";
import { unsyncedCount } from "@/lib/offline/sale-queue-db";
import { logError } from "@/lib/logger";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { useActivePermissions, useActiveMembership, useActiveShopId } from "@/features/auth/use-memberships";
import { CustomerPickerSheet, type PickedCustomer } from "@/features/customers/customer-picker-sheet";
import { debtFromSale } from "@/features/customers/debt-math";
import { printReceipt } from "@/features/print/print-receipt";
import type { ReceiptData, ReceiptLine } from "@/features/print/types";
import { QrPaymentSheet } from "./qr-payment-sheet";
import { acquiringHasCredentials } from "./acquiring/acquiring-api";
import { BottomSheet, SheetPressable } from "@/components/ui/bottom-sheet";

const METHODS: { id: PaymentMethod; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "cash", labelKey: "sell.payCash", icon: "cash-outline" },
  { id: "card", labelKey: "sell.payCard", icon: "card-outline" },
  { id: "qr", labelKey: "sell.payQr", icon: "qr-code-outline" },
  { id: "debt", labelKey: "sell.payCredit", icon: "book-outline" },
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

export function PaymentSheet({ visible, total, shopId: propShopId, items, onClose, onPaid }: Props) {
  const colors = useColors();

  const { t } = useTranslation();
  const qc = useQueryClient();
  const activeShopId = useActiveShopId();
  const currentShopId = propShopId ?? activeShopId;
  const { canManageDebt } = useActivePermissions();
  const shop = useActiveMembership()?.shop;
  const setQueueCount = useOfflineStore((s) => s.setCount);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [givenText, setGivenText] = useState("");
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [clientId, setClientId] = useState(uuidv4());
  // Nasiya holati (faqat method === "debt" da ishlatiladi)
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [debtPaidText, setDebtPaidText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  // QR ekvayring + chek
  const [qrOpen, setQrOpen] = useState(false);
  const [qrResult, setQrResult] = useState<SaleResult | null>(null);
  const [soldItems, setSoldItems] = useState<CartItem[]>([]);

  const { data: hasAcquiring } = useQuery({
    queryKey: ["acquiring-creds", currentShopId],
    queryFn: () => acquiringHasCredentials(currentShopId as string),
    enabled: !!currentShopId,
    staleTime: 5 * 60_000,
  });

  const methods = canManageDebt ? METHODS : METHODS.filter((m) => m.id !== "debt");
  const debtPaid = parseFloat(debtPaidText.replace(/\s/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: () =>
      submitSale({
        shopId: currentShopId as string,
        items,
        clientId,
        method,
        // Naqd/Karta/QR uchun null — mavjud oqim o'zgarmaydi
        customerId: method === "debt" ? customer?.id ?? null : null,
        paidAmount: method === "debt" ? debtPaid : null,
      }),
    onSuccess: (data) => {
      setSoldItems(items); // chek uchun — onPaid savatni tozalashidan oldin
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sell-search"] });
      // Offline'da navbatga yozildi → badge sanog'ini yangilaymiz
      if (data.offline && currentShopId)
        unsyncedCount(currentShopId)
          .then(setQueueCount)
          .catch((e) => logError("payment.queueCount", e));
      onPaid(); // savatni tozalaydi (qayta sotuv oldini oladi)
      setPhase("success");
    },
    onError: (error) => {
      const msg = (error as Error)?.message ?? "Noma'lum sotuv xatoligi";
      Alert.alert(t("sell.saleErrorTitle"), msg);
    },
  });

  // QR (ekvayring) muvaffaqiyatli to'langanda
  function onQrPaid(res: SaleResult) {
    setSoldItems(items);
    setQrResult(res);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["sell-search"] });
    onPaid();
    setQrOpen(false);
    setPhase("success");
  }

  /** To'lov tugmasi — QR + ekvayring bo'lsa QR oynasi, aks holda oddiy sotuv. */
  function onPayPress() {
    if (!currentShopId) {
      Alert.alert("Do'kon Xatosi", "Do'kon identifikatori (shopId) yetib kelmadi!");
      return;
    }
    if (method === "debt" && !customer) {
      Alert.alert(t("sell.noCustomerTitle"), "Nasiya uchun mijozni tanlang!");
      return;
    }
    if (method === "qr" && hasAcquiring) {
      setQrOpen(true);
    } else {
      mutation.mutate();
    }
  }

  useEffect(() => {
    if (visible) {
      setMethod("cash");
      setGivenText("");
      setPhase("form");
      setClientId(uuidv4());
      setCustomer(null);
      setDebtPaidText("");
      setPickerOpen(false);
      setQrOpen(false);
      setQrResult(null);
      setSoldItems([]);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const result = mutation.data ?? qrResult;
  const effectiveTotal = result?.total_revenue ?? total;
  const given = parseFloat(givenText.replace(/\s/g, "")) || 0;
  const change = changeAmount(given, effectiveTotal);
  const cashShort = method === "cash" && given > 0 && given < total;
  // Nasiya uchun mijoz tanlangan bo'lishi shart; Naqd/Karta/QR uchun avvalgidek
  const debtReady = method === "debt" ? !!customer : true;
  const canPay = !!currentShopId && items.length > 0 && debtReady && !mutation.isPending;

  function handlePrint() {
    const lines: ReceiptLine[] = soldItems.map((i) => ({
      name: i.product.name,
      saleType: i.product.sale_type,
      quantity: i.quantity,
      unitPrice: i.product.selling_price,
      lineTotal: Math.round(i.product.selling_price * 100 * i.quantity) / 100,
    }));
    const data: ReceiptData = {
      shopName: shop?.name ?? "Do'kon",
      saleId: result?.sale_id ?? clientId,
      soldAt: new Date().toISOString(),
      items: lines,
      totalRevenue: effectiveTotal,
      paymentMethod: (() => {
        const key = METHODS.find((m) => m.id === method)?.labelKey;
        return key ? t(key) : method;
      })(),
      givenAmount: method === "cash" ? given : undefined,
      changeAmount: method === "cash" ? Math.max(0, change) : undefined,
      debtAmount: method === "debt" ? debtFromSale(effectiveTotal, debtPaid) : undefined,
      customerName: method === "debt" ? customer?.name ?? undefined : undefined,
    };
    void printReceipt(data);
  }

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      dismissOnBackdrop={phase === "form"}
      handle={phase !== "success"}
    >
          {phase === "success" ? (
            <View className="items-center" style={{ paddingVertical: 8 }}>
              <View
                className="mb-4 h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.successTint }}
              >
                <Ionicons name="checkmark" size={44} color={colors.success} />
              </View>
              <Text className="text-xl font-medium text-ink">
                {result?.offline ? t("sell.saleSavedOffline") : t("sell.saleSuccess")}
              </Text>
              <Text className="mt-1 text-base text-muted">{formatCurrency(effectiveTotal)}</Text>
              {result?.offline ? (
                <View className="mt-2 flex-row items-center gap-1.5 rounded-full bg-bg px-3 py-1">
                  <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
                  <Text className="text-xs font-medium" style={{ color: colors.warning }}>
                    {t("sell.offlineWillSync")}
                  </Text>
                </View>
              ) : null}
              {method === "cash" && change > 0 ? (
                <Text className="mt-1 text-base font-medium text-success">
                  {t("sell.change")}: {formatCurrency(change)}
                </Text>
              ) : null}
              {method === "debt" ? (
                <Text className="mt-1 text-base font-medium" style={{ color: colors.dangerInk }}>
                  {t("sell.debtRecorded")}: {formatCurrency(debtFromSale(effectiveTotal, debtPaid))}
                </Text>
              ) : null}
              <View className="mt-6 w-full flex-row gap-3">
                <SheetPressable
                  onPress={handlePrint}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-bg"
                  style={{ height: 54, borderWidth: 1, borderColor: colors.primary }}
                >
                  <Ionicons name="print-outline" size={20} color={colors.primary} />
                  <Text className="text-base font-medium" style={{ color: colors.primary }}>
                    {t("receipt.label")}
                  </Text>
                </SheetPressable>
                <SheetPressable
                  onPress={onClose}
                  className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary"
                  style={{ height: 54 }}
                >
                  <Text className="text-base font-medium text-white">{t("sell.newSale")}</Text>
                </SheetPressable>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-center text-xs text-muted" style={{ letterSpacing: 0.5 }}>
                {t("sell.totalDue").toUpperCase()}
              </Text>
              <Text className="mb-4 text-center text-3xl font-medium" style={{ color: colors.primary }}>
                {formatCurrency(total)}
              </Text>

              <Text className="mb-2 text-sm font-medium text-ink">{t("sell.paymentType")}</Text>
              <View className="mb-4 flex-row gap-2">
                {methods.map((m) => {
                  const active = method === m.id;
                  return (
                    <SheetPressable
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
                        {t(m.labelKey)}
                      </Text>
                    </SheetPressable>
                  );
                })}
              </View>

              {method === "cash" ? (
                <View className="mb-4">
                  <Text className="mb-1 text-sm font-medium text-ink">{t("sell.givenMoney")}</Text>
                  <BottomSheetTextInput
                    value={givenText}
                    onChangeText={setGivenText}
                    keyboardType="number-pad"
                    placeholder={formatNumber(total)}
                    placeholderTextColor={colors.tabInactive}
                    className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                    style={{ height: 56 }}
                  />
                  <View className="mt-2 flex-row gap-2">
                    <SheetPressable
                      onPress={() => setGivenText(String(total))}
                      className="flex-1 items-center justify-center rounded-xl bg-bg"
                      style={{ height: 40 }}
                    >
                      <Text className="text-sm font-medium text-ink">{t("sell.exact")}</Text>
                    </SheetPressable>
                    {QUICK.map((q) => (
                      <SheetPressable
                        key={q}
                        onPress={() => setGivenText(String(q))}
                        className="flex-1 items-center justify-center rounded-xl bg-bg"
                        style={{ height: 40 }}
                      >
                        <Text className="text-sm font-medium text-ink">{formatNumber(q)}</Text>
                      </SheetPressable>
                    ))}
                  </View>
                  {given > 0 ? (
                    <View
                      className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
                      style={{ backgroundColor: cashShort ? colors.dangerTint : colors.successTint }}
                    >
                      <Text className="text-sm" style={{ color: cashShort ? colors.dangerInk : colors.successInk }}>
                        {cashShort ? t("sell.notEnough") : t("sell.change")}
                      </Text>
                      <Text
                        className="text-base font-medium"
                        style={{ color: cashShort ? colors.dangerInk : colors.successInk }}
                      >
                        {formatCurrency(Math.abs(change))}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : method === "debt" ? (
                <View className="mb-4" style={{ gap: 10 }}>
                  {/* Mijoz tanlash */}
                  <SheetPressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center justify-between rounded-2xl border border-line bg-bg px-4"
                    style={{ height: 56 }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="person-outline" size={20} color={colors.primary} />
                      <Text className="text-base" style={{ color: customer ? colors.ink : colors.muted }}>
                        {customer ? customer.name : t("sell.pickCustomer")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
                  </SheetPressable>

                  {/* To'langan summa (qisman to'lov; bo'sh = to'liq nasiya) */}
                  <View>
                    <Text className="mb-1 text-sm font-medium text-ink">{t("sell.paidOptional")}</Text>
                    <BottomSheetTextInput
                      value={debtPaidText}
                      onChangeText={setDebtPaidText}
                      keyboardType="number-pad"
                      placeholder={t("sell.fullCreditPlaceholder")}
                      placeholderTextColor={colors.tabInactive}
                      className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
                      style={{ height: 56 }}
                    />
                  </View>

                  {/* Qarz preview */}
                  <View
                    className="flex-row items-center justify-between rounded-2xl px-4 py-3"
                    style={{ backgroundColor: colors.dangerTint }}
                  >
                    <Text className="text-sm" style={{ color: colors.dangerInk }}>{t("sell.willOwe")}</Text>
                    <Text className="text-base font-medium" style={{ color: colors.dangerInk }}>
                      {formatCurrency(debtFromSale(total, debtPaid))}
                    </Text>
                  </View>
                </View>
              ) : null}

              {mutation.isError ? (
                <Text className="mb-3 text-center text-sm text-danger">
                  {(mutation.error as Error)?.message ?? t("common.unknownError")}
                </Text>
              ) : null}

              <SheetPressable
                disabled={!canPay}
                onPress={onPayPress}
                className="flex-row items-center justify-center rounded-2xl bg-primary"
                style={{ height: 54, opacity: canPay ? 1 : 0.5 }}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-medium text-white">
                    {method === "qr" && hasAcquiring ? t("sell.showQr") : t("sell.finishPayment")}
                  </Text>
                )}
              </SheetPressable>
            </>
          )}
    </BottomSheet>

    {currentShopId ? (
      <CustomerPickerSheet
        visible={pickerOpen}
        shopId={currentShopId}
        onSelect={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    ) : null}

    {currentShopId ? (
      <QrPaymentSheet
        visible={qrOpen}
        shopId={currentShopId}
        items={items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }))}
        amount={total}
        clientId={clientId}
        onPaid={onQrPaid}
        onClose={() => setQrOpen(false)}
      />
    ) : null}
    </>
  );
}

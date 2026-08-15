import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { tabularNums } from "@/theme/typography";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { logError } from "@/lib/logger";
import { copyToClipboard } from "@/lib/clipboard";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/ui/icon-chip";
import { usePlansList } from "@/features/billing/use-plan";
import { CheckoutSteps } from "@/features/billing/checkout-steps";
import { ReceiptPicker } from "@/features/billing/receipt-picker";
import { MANUAL_CARD, paymentRef, supportTelegramUrl } from "@/features/billing/payment-config";
import {
  checkoutStep,
  maskCardNumber,
  plainCardNumber,
  statusTone,
  statusLabelKey,
  rejectionLabelKey,
  type PaymentStatus,
} from "@/features/billing/payment-status";
import { paymentErrorMessage, receiptErrorMessage } from "@/features/billing/payment-errors";
import {
  pickReceipt,
  uploadReceipt,
  ReceiptError,
  type PickedReceipt,
  type ReceiptSource,
} from "@/features/billing/receipt-upload";
import {
  useActivePayment,
  useCancelPayment,
  useCreatePayment,
  useSubmitReceipt,
} from "@/features/billing/use-payments";
import type { PaymentRow } from "@/features/billing/payments-api";

/* ─────────────────────────────────────────────────────────────────────────
   1-qadam — tanlangan tarif
───────────────────────────────────────────────────────────────────────── */
function PlanSummary({
  planCode,
  period,
  amount,
  status,
}: {
  planCode: string;
  period: "month" | "year";
  amount: number;
  status?: PaymentStatus;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Card elevated style={{ gap: space.sm, marginBottom: space.lg }}>
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: text.xs, fontWeight: "700", color: colors.primary, letterSpacing: 0.8 }}>
          {t("billing.stepPlan")}
        </Text>
        {status ? <Badge label={t(statusLabelKey(status))} tone={statusTone(status)} /> : null}
      </View>

      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink }}>
          {t(`billing.plan.${planCode}`)}
        </Text>
        <Text style={{ fontSize: text.sm, color: colors.muted }}>
          {period === "year" ? t("billing.periodYear") : t("billing.periodMonth")}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: space.sm,
        }}
      >
        <Text style={{ fontSize: text.sm, color: colors.muted }}>{t("billing.amountLabel")}</Text>
        <Text style={{ fontSize: text.xl2, fontWeight: "800", color: colors.ink, ...tabularNums }}>
          {formatCurrency(amount)}
        </Text>
      </View>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   2-qadam — to'lov rekvizitlari
───────────────────────────────────────────────────────────────────────── */
function PaymentInstructions({ amount }: { amount: number }) {
  const colors = useColors();
  const { t } = useTranslation();

  async function onCopyCard() {
    const full = plainCardNumber(MANUAL_CARD.number);
    if (await copyToClipboard(full)) {
      toast.success(t("billing.cardCopied"));
      return;
    }
    // Native modul yo'q (eski dev build) — raqamni to'liq ko'rsatamiz.
    Alert.alert(t("billing.copyUnavailableTitle"), `${full}\n\n${t("billing.copyUnavailableBody")}`, [
      { text: t("common.close") },
    ]);
  }

  return (
    <Card style={{ gap: space.md, marginBottom: space.lg }}>
      <Text style={{ fontSize: text.xs, fontWeight: "700", color: colors.primary, letterSpacing: 0.8 }}>
        {t("billing.stepPay")}
      </Text>

      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: colors.primaryTint,
          borderWidth: 1,
          borderColor: colors.primary,
          padding: space.lg,
          gap: space.sm,
        }}
      >
        <Text style={{ fontSize: text.xs, color: colors.muted }}>{t("billing.cardLabel")}</Text>
        <View className="flex-row items-center justify-between">
          <Text
            selectable
            style={{
              fontSize: text.lg,
              fontWeight: "700",
              color: colors.ink,
              letterSpacing: 1.5,
              ...tabularNums,
            }}
          >
            {/* Maskalangan: to'liq raqamni "Nusxalash" beradi. Nusxalash
                ishlamay qolgan holatda ham `onCopyCard` raqamni Alert'da
                to'liq ko'rsatadi — foydalanuvchi to'lovsiz qolmaydi. */}
            {maskCardNumber(MANUAL_CARD.number)}
          </Text>
          <Pressable
            onPress={onCopyCard}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("billing.copy")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
            }}
          >
            <Ionicons name="copy-outline" size={14} color="#fff" />
            <Text style={{ fontSize: text.xs, fontWeight: "700", color: "#fff" }}>
              {t("billing.copy")}
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: text.xs, color: colors.muted }}>{MANUAL_CARD.holder}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: text.sm, color: colors.muted }}>{t("billing.amountExact")}</Text>
        <Text
          selectable
          style={{ fontSize: text.base, fontWeight: "700", color: colors.ink, ...tabularNums }}
        >
          {formatCurrency(amount)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: colors.warningTint,
          borderWidth: 1,
          borderColor: colors.warning,
        }}
      >
        <Ionicons name="alert-circle-outline" size={18} color={colors.warningInk} />
        <Text style={{ flex: 1, fontSize: text.xs, color: colors.warningInk, lineHeight: 17 }}>
          {t("billing.amountWarning")}
        </Text>
      </View>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Yuborilgan / rad etilgan holatlar
───────────────────────────────────────────────────────────────────────── */
function ReviewingState({ payment, onReplace }: { payment: PaymentRow; onReplace: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Card tone="warning" style={{ gap: space.md, alignItems: "center" }}>
      <IconChip icon="hourglass-outline" size="lg" tone="warning" />
      <Text style={{ fontSize: text.base, fontWeight: "700", color: colors.ink, textAlign: "center" }}>
        {t("billing.reviewingTitle")}
      </Text>
      <Text style={{ fontSize: text.sm, color: colors.muted, textAlign: "center", lineHeight: 19 }}>
        {t("billing.reviewingBody")}
      </Text>
      {payment.submitted_at ? (
        <Text style={{ fontSize: text.xs, color: colors.muted }}>
          {new Date(payment.submitted_at).toLocaleString()}
        </Text>
      ) : null}
      <Button variant="ghost" label={t("billing.receiptReplace")} onPress={onReplace} />
    </Card>
  );
}

function RejectedState({ payment, onRetry }: { payment: PaymentRow; onRetry: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Card tone="danger" style={{ gap: space.md }}>
      <View className="flex-row items-center gap-3">
        <IconChip icon="close-circle-outline" tone="danger" />
        <Text style={{ flex: 1, fontSize: text.base, fontWeight: "700", color: colors.ink }}>
          {t("billing.rejectedTitle")}
        </Text>
      </View>
      {payment.rejection_code ? (
        <Text style={{ fontSize: text.sm, color: colors.dangerInk }}>
          {t(rejectionLabelKey(payment.rejection_code))}
        </Text>
      ) : null}
      {payment.rejection_reason ? (
        <Text style={{ fontSize: text.sm, color: colors.muted, lineHeight: 19 }}>
          {payment.rejection_reason}
        </Text>
      ) : null}
      <Button label={t("billing.retryPayment")} onPress={onRetry} />
    </Card>
  );
}

/**
 * To'lov ekrani — tarif → karta rekvizitlari → chek.
 *
 * To'lov yozuvi ATAYLAB ekran ochilganda EMAS, foydalanuvchi haqiqiy
 * amal qilganda (chek yuborish yoki Telegram) yaratiladi. Aks holda
 * shunchaki tarifni ko'zdan kechirgan foydalanuvchida ham "davom etayotgan
 * to'lov" paydo bo'lardi va tarif ekranida bannerni ko'rib chalkashardi
 * (qurilmada tasdiqlangan muammo).
 */
export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ plan?: string; period?: string }>();

  const { data: activePayment, isLoading } = useActivePayment();
  const { data: plans } = usePlansList();
  const createMut = useCreatePayment();
  const submitMut = useSubmitReceipt();
  const cancelMut = useCancelPayment();

  const [file, setFile] = useState<PickedReceipt | null>(null);
  const [picking, setPicking] = useState(false);
  const [reference, setReference] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [sending, setSending] = useState(false);

  // Manzilda tarif berilgan bo'lsa (foydalanuvchi endigina "Obuna bo'lish"
  // bosgan) — U USTUN. Berilmagan bo'lsa (bannerdan ochilgan) mavjud
  // to'lovniki. Ilgari teskarisi edi: Ultra bosilsa ham ekranda tekshiruvda
  // turgan Pro ko'rinardi (qurilmada tasdiqlangan xato).
  const requestedPlan = params.plan ?? null;
  const requestedPeriod: "month" | "year" | null =
    params.period === "year" ? "year" : params.period === "month" ? "month" : null;

  const planCode = requestedPlan ?? activePayment?.plan_code ?? "pro";
  const period: "month" | "year" = requestedPeriod ?? activePayment?.period ?? "month";

  /**
   * Foydalanuvchi BOSHQA tarifni tanladi, lekin mavjud to'lov allaqachon
   * tekshiruvda. Serverda bir vaqtda faqat bitta faol to'lov bo'lishi mumkin
   * (`uq_payments_active`), shuning uchun uni jimgina almashtirib bo'lmaydi —
   * foydalanuvchiga ochiq aytamiz. (`pending` holatda esa server o'zi
   * yangilaydi, hech narsa to'sish shart emas.)
   */
  const conflict =
    !!activePayment &&
    activePayment.status === "reviewing" &&
    !!requestedPlan &&
    (activePayment.plan_code !== requestedPlan ||
      (!!requestedPeriod && activePayment.period !== requestedPeriod));

  // Summa: mavjud to'lov aynan shu tarif uchun bo'lsa SERVER hisoblagani,
  // aks holda ko'rsatish uchun `plans` dan (haqiqiysini baribir server
  // belgilaydi — mijoz narx uzatmaydi).
  const planRow = plans?.find((p) => p.code === planCode);
  const sameAsActive =
    activePayment?.plan_code === planCode && activePayment?.period === period;
  const amount =
    (sameAsActive ? activePayment?.amount : undefined) ??
    (period === "year" ? planRow?.priceYear : planRow?.priceMonth) ??
    0;

  /** To'lov yozuvini kerak bo'lganda yaratadi (yoki mavjudini yangilaydi). */
  async function ensurePayment(): Promise<PaymentRow> {
    if (activePayment && sameAsActive) return activePayment;
    // Tarif/muddat o'zgargan bo'lsa server `pending` yozuvni yangilaydi.
    return createMut.mutateAsync({ planCode, period });
  }

  async function onPick(source: ReceiptSource) {
    setPicking(true);
    try {
      const picked = await pickReceipt(source);
      if (picked) setFile(picked);
    } catch (e) {
      if (e instanceof ReceiptError) {
        toast.error(t("billing.receiptError"), receiptErrorMessage(e.code));
      } else {
        logError("checkout.pickReceipt", e);
        toast.error(t("billing.receiptError"), receiptErrorMessage("read_failed"));
      }
    } finally {
      setPicking(false);
    }
  }

  async function onSubmitUpload() {
    if (!file || sending) return;
    setSending(true);
    try {
      const payment = await ensurePayment();
      const path = await uploadReceipt(file, payment.shop_id, payment.id);
      await submitMut.mutateAsync({
        paymentId: payment.id,
        channel: "upload",
        path,
        reference: reference.trim() || null,
      });
      setFile(null);
      setReplacing(false);
      toast.success(t("billing.receiptSent"));
    } catch (e) {
      logError("checkout.submitReceipt", e);
      toast.error(t("billing.receiptError"), paymentErrorMessage((e as Error)?.message));
    } finally {
      setSending(false);
    }
  }

  async function onTelegram() {
    if (sending) return;
    setSending(true);
    try {
      const payment = await ensurePayment();
      await submitMut.mutateAsync({
        paymentId: payment.id,
        channel: "telegram",
        reference: reference.trim() || null,
      });

      // Matnni nusxalash IXTIYORIY qadam (native modul bo'lmasligi mumkin)
      // va Telegram ochilishi ham muvaffaqiyatsiz bo'lishi mumkin (ilova
      // o'rnatilmagan). Ikkalasi ham ASOSIY oqimni (chek yuborildi) to'xtata
      // olmasligi kerak — shuning uchun alohida try/catch ichida.
      const message = t("billing.telegramMessage", {
        ref: paymentRef(payment.id),
        plan: t(`billing.plan.${payment.plan_code}`),
        amount: formatCurrency(payment.amount),
      });
      await copyToClipboard(message);

      try {
        await Linking.openURL(supportTelegramUrl());
      } catch (e) {
        logError("checkout.openTelegram", e);
        Alert.alert(t("billing.telegramBtn"), t("billing.telegramFallback", { ref: paymentRef(payment.id) }), [
          { text: t("common.close") },
        ]);
      }
    } catch (e) {
      logError("checkout.telegram", e);
      toast.error(t("billing.paymentError"), paymentErrorMessage((e as Error)?.message));
    } finally {
      setSending(false);
    }
  }

  /**
   * `stayOnScreen` — to'qnashuv holatida ishlatiladi: eski to'lov bekor
   * qilingach foydalanuvchi YANGI tarif bilan shu yerda davom etadi,
   * orqaga qaytarilmaydi.
   */
  function onCancel(stayOnScreen = false) {
    if (!activePayment) {
      router.back();
      return;
    }
    Alert.alert(t("billing.cancelTitle"), t("billing.cancelConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("billing.cancelBtn"),
        style: "destructive",
        onPress: () =>
          cancelMut.mutate(activePayment.id, {
            onSuccess: () => {
              if (!stayOnScreen) router.back();
            },
            onError: (e) =>
              toast.error(t("billing.paymentError"), paymentErrorMessage((e as Error)?.message)),
          }),
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenHeader title={t("billing.checkoutTitle")} />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Skeleton height={120} />
          <Skeleton height={200} />
        </View>
      </SafeAreaView>
    );
  }

  const status = activePayment?.status;
  const step = status ? checkoutStep(status) : 1;
  const showUploader = !status || status === "pending" || replacing;
  const busy = sending || submitMut.isPending || createMut.isPending;

  // Boshqa tarif tanlandi, lekin avvalgi to'lov hali tekshiruvda.
  if (conflict && activePayment) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenHeader title={t("billing.checkoutTitle")} />
        <ScrollView contentContainerStyle={{ padding: space.lg }}>
          <Card tone="warning" style={{ gap: space.md, alignItems: "center" }}>
            <IconChip icon="alert-circle-outline" size="lg" tone="warning" />
            <Text
              style={{ fontSize: text.base, fontWeight: "700", color: colors.ink, textAlign: "center" }}
            >
              {t("billing.conflictTitle")}
            </Text>
            <Text style={{ fontSize: text.sm, color: colors.muted, textAlign: "center", lineHeight: 19 }}>
              {t("billing.conflictBody", {
                plan: t(`billing.plan.${activePayment.plan_code}`),
                amount: formatCurrency(activePayment.amount),
              })}
            </Text>
            <Button
              label={t("billing.conflictCancelBtn")}
              onPress={() => onCancel(true)}
              loading={cancelMut.isPending}
            />
            <Button variant="ghost" label={t("common.back")} onPress={() => router.back()} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("billing.checkoutTitle")} />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CheckoutSteps current={step} />

        <PlanSummary planCode={planCode} period={period} amount={amount} status={status} />

        {status === "rejected" && activePayment ? (
          <RejectedState payment={activePayment} onRetry={() => setReplacing(true)} />
        ) : status === "reviewing" && activePayment && !replacing ? (
          <ReviewingState payment={activePayment} onReplace={() => setReplacing(true)} />
        ) : (
          <>
            <PaymentInstructions amount={amount} />

            <Text
              style={{
                fontSize: text.xs,
                fontWeight: "700",
                color: colors.primary,
                letterSpacing: 0.8,
                marginBottom: space.sm,
              }}
            >
              {t("billing.stepReceipt")}
            </Text>

            {showUploader ? (
              <View style={{ gap: space.md }}>
                <ReceiptPicker
                  file={file}
                  picking={picking}
                  disabled={busy}
                  onPick={onPick}
                  onClear={() => setFile(null)}
                />

                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder={t("billing.referencePlaceholder")}
                  placeholderTextColor={colors.tabInactive}
                  accessibilityLabel={t("billing.referenceLabel")}
                  className="rounded-2xl border border-line bg-surface px-4 text-base text-ink"
                  style={{ height: 48 }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                {/* Tugma fayl tanlangandagina ko'rinadi: o'chirilgan (xira)
                    tugma "bosilib turgandek" ko'rinadi va foydalanuvchi nega
                    ishlamayotganini tushunmaydi (qurilmada tasdiqlangan). */}
                {file ? (
                  <Button
                    label={t("billing.receiptSend")}
                    onPress={onSubmitUpload}
                    loading={busy}
                    disabled={busy}
                  />
                ) : null}

                {/* Zaxira kanal (talab #5) */}
                <Pressable
                  onPress={onTelegram}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t("billing.telegramBtn")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: space.sm,
                    height: 48,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="paper-plane-outline" size={17} color={colors.primary} />
                  <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.primary }}>
                    {t("billing.telegramBtn")}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: text.xs, color: colors.muted, textAlign: "center", lineHeight: 16 }}>
                  {t("billing.telegramHint")}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <Button variant="ghost" label={t("billing.cancelBtn")} onPress={() => onCancel()} />
      </ScrollView>
    </SafeAreaView>
  );
}

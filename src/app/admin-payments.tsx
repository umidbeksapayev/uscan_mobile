import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { tabularNums } from "@/theme/typography";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { logError } from "@/lib/logger";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  REJECTION_CODES,
  rejectionLabelKey,
  statusLabelKey,
  statusTone,
  type PaymentStatus,
  type RejectionCode,
} from "@/features/billing/payment-status";
import { paymentErrorMessage } from "@/features/billing/payment-errors";
import { paymentRef } from "@/features/billing/payment-config";
import { getReceiptSignedUrl, type AdminPaymentRow } from "@/features/billing/payments-api";
import {
  useAdminPayments,
  useAdminReviewPayment,
  useIsSuperAdmin,
} from "@/features/billing/use-payments";

/** Chip yorliqlari ATAYLAB qisqa (`billing.filter.*`) — to'liq holat nomlari
 *  ("To'lov kutilmoqda") chipni haddan tashqari kengaytirib yuboradi. */
const FILTERS: { key: PaymentStatus | "all"; labelKey: string }[] = [
  { key: "reviewing", labelKey: "billing.filter.reviewing" },
  { key: "pending", labelKey: "billing.filter.pending" },
  { key: "approved", labelKey: "billing.filter.approved" },
  { key: "rejected", labelKey: "billing.filter.rejected" },
  { key: "all", labelKey: "billing.filter.all" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Rad etish varag'i — sabab kodi + ixtiyoriy izoh (talab #8)
───────────────────────────────────────────────────────────────────────── */
function RejectSheet({
  visible,
  onClose,
  onReject,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onReject: (code: RejectionCode, note: string) => void;
  saving: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [code, setCode] = useState<RejectionCode>("wrong_amount");
  const [note, setNote] = useState("");

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding contentStyle={{ gap: space.md }}>
      <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink }}>
        {t("billing.rejectTitle")}
      </Text>

      <View style={{ gap: space.sm }}>
        {REJECTION_CODES.map((c) => {
          const active = code === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCode(c)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(rejectionLabelKey(c))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                padding: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.line,
                backgroundColor: active ? colors.primaryTint : colors.surface,
              }}
            >
              <Ionicons
                name={active ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={active ? colors.primary : colors.muted}
              />
              <Text style={{ flex: 1, fontSize: text.sm, color: colors.ink }}>
                {t(rejectionLabelKey(c))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        textAlignVertical="top"
        maxLength={300}
        placeholder={t("billing.rejectNotePlaceholder")}
        placeholderTextColor={colors.tabInactive}
        accessibilityLabel={t("billing.rejectNotePlaceholder")}
        className="rounded-2xl border border-line bg-bg px-4 py-3 text-base text-ink"
        style={{ height: 90 }}
      />

      <Button
        label={t("billing.rejectBtn")}
        onPress={() => onReject(code, note)}
        loading={saving}
      />
      <Button variant="ghost" label={t("common.cancel")} onPress={onClose} />
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Chek ko'ruvchi — PRIVATE bucket, signed URL bilan ochiladi
───────────────────────────────────────────────────────────────────────── */
function ReceiptViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View className="flex-row items-center justify-end px-4 py-2">
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>
          {url ? (
            <Image
              source={{ uri: url }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={150}
            />
          ) : null}
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: text.xs, padding: space.md }}>
            {t("billing.receiptViewerHint")}
          </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   To'lov kartasi
───────────────────────────────────────────────────────────────────────── */
function PaymentCard({
  row,
  onViewReceipt,
  onApprove,
  onReject,
  busy,
}: {
  row: AdminPaymentRow;
  onViewReceipt: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const pending = row.status === "reviewing" || row.status === "pending";

  return (
    <Card elevated style={{ marginBottom: space.md, gap: space.md }}>
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: text.base, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
            {row.shop_name}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
            {row.owner_email ?? "—"}
          </Text>
        </View>
        <Badge label={t(statusLabelKey(row.status))} tone={statusTone(row.status)} />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.line,
          paddingVertical: space.md,
        }}
      >
        <View>
          <Text style={{ fontSize: text.xs, color: colors.muted }}>{t("billing.planLabel")}</Text>
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink, marginTop: 2 }}>
            {t(`billing.plan.${row.plan_code}`)} ·{" "}
            {row.period === "year" ? t("billing.periodYear") : t("billing.periodMonth")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: text.xs, color: colors.muted }}>{t("billing.amountLabel")}</Text>
          <Text
            style={{ fontSize: text.base, fontWeight: "800", color: colors.ink, marginTop: 2, ...tabularNums }}
          >
            {formatCurrency(row.amount)}
          </Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: text.xs, color: colors.muted }}>
          {t("billing.refLabel")}: {paymentRef(row.id)}
        </Text>
        {row.reference ? (
          <Text style={{ fontSize: text.xs, color: colors.muted }}>
            {t("billing.referenceLabel")}: {row.reference}
          </Text>
        ) : null}
        <Text style={{ fontSize: text.xs, color: colors.muted }}>
          {new Date(row.submitted_at ?? row.created_at).toLocaleString()}
        </Text>
        {row.rejection_code ? (
          <Text style={{ fontSize: text.xs, color: colors.dangerInk }}>
            {t(rejectionLabelKey(row.rejection_code))}
            {row.rejection_reason ? ` — ${row.rejection_reason}` : ""}
          </Text>
        ) : null}
      </View>

      {/* Chek */}
      {row.receipt_path ? (
        <Pressable
          onPress={onViewReceipt}
          accessibilityRole="button"
          accessibilityLabel={t("billing.viewReceipt")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.primaryTint,
            borderWidth: 1,
            borderColor: colors.primary,
          }}
        >
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: text.sm, fontWeight: "600", color: colors.primary }}>
            {t("billing.viewReceipt")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.neutralTint,
          }}
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.muted} />
          <Text style={{ flex: 1, fontSize: text.xs, color: colors.muted }}>
            {row.receipt_channel === "telegram"
              ? t("billing.receiptViaTelegram")
              : t("billing.noReceiptYet")}
          </Text>
        </View>
      )}

      {pending ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Pressable
            onPress={onReject}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("billing.rejectBtn")}
            style={{
              flex: 1,
              height: 46,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: colors.dangerBorder,
              backgroundColor: colors.dangerTint,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: text.sm, fontWeight: "700", color: colors.dangerInk }}>
              {t("billing.rejectBtn")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onApprove}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("billing.approveBtn")}
            style={{
              flex: 1,
              height: 46,
              borderRadius: radius.lg,
              backgroundColor: colors.successInk,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ fontSize: text.sm, fontWeight: "700", color: "#fff" }}>
                {t("billing.approveBtn")}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * To'lovlarni tekshirish — FAQAT super_admin.
 *
 * Haqiqiy himoya serverda: `admin_list_payments()` va
 * `admin_review_payment()` ikkalasi ham `is_super_admin()` bilan gate
 * qilingan (045-migratsiya). Bu ekran shunchaki ularning ustidagi UI —
 * super_admin bo'lmagan foydalanuvchi bu yerga kirsa ham hech narsa
 * ko'rmaydi.
 */
export default function AdminPaymentsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { data: isAdmin, isLoading: adminLoading } = useIsSuperAdmin();

  const [filter, setFilter] = useState<PaymentStatus | "all">("reviewing");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminPaymentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: payments, isLoading } = useAdminPayments(
    filter === "all" ? undefined : filter,
  );
  const reviewMut = useAdminReviewPayment();

  async function onViewReceipt(row: AdminPaymentRow) {
    if (!row.receipt_path) return;
    try {
      const url = await getReceiptSignedUrl(row.receipt_path);
      setReceiptUrl(url);
    } catch (e) {
      logError("admin.receiptUrl", e);
      toast.error(t("billing.receiptError"), paymentErrorMessage((e as Error)?.message));
    }
  }

  function onApprove(row: AdminPaymentRow) {
    setBusyId(row.id);
    reviewMut.mutate(
      { paymentId: row.id, approve: true },
      {
        onSuccess: () => toast.success(t("billing.approvedToast")),
        onError: (e) =>
          toast.error(t("billing.paymentError"), paymentErrorMessage((e as Error)?.message)),
        onSettled: () => setBusyId(null),
      },
    );
  }

  function onReject(code: RejectionCode, note: string) {
    if (!rejecting) return;
    const row = rejecting;
    setBusyId(row.id);
    reviewMut.mutate(
      { paymentId: row.id, approve: false, rejectionCode: code, rejectionText: note },
      {
        onSuccess: () => {
          setRejecting(null);
          toast.success(t("billing.rejectedToast"));
        },
        onError: (e) =>
          toast.error(t("billing.paymentError"), paymentErrorMessage((e as Error)?.message)),
        onSettled: () => setBusyId(null),
      },
    );
  }

  if (!adminLoading && !isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenHeader title={t("billing.adminTitle")} />
        <View className="flex-1 items-center justify-center px-10" style={{ gap: space.sm }}>
          <IconChip icon="lock-closed-outline" size="lg" tone="neutral" />
          <Text className="text-center text-sm text-muted">{t("billing.adminOnly")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rows = payments ?? [];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("billing.adminTitle")} />

      {/* Holat filtri.
          `flexGrow: 0` + `alignItems: "center"` SHART: gorizontal
          ScrollView bolalarni ko'ndalang o'qda cho'zadi va chiplar butun
          ekran balandligiga yoyilib ketadi (qurilmada tasdiqlangan). */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            gap: space.sm,
            alignItems: "center",
          }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(f.labelKey)}
                style={{
                  height: 34,
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.line,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: text.xs,
                    fontWeight: "600",
                    color: active ? "#fff" : colors.muted,
                  }}
                >
                  {t(f.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" text={t("billing.adminEmpty")} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: space.lg,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row) => (
            <PaymentCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onViewReceipt={() => void onViewReceipt(row)}
              onApprove={() => onApprove(row)}
              onReject={() => setRejecting(row)}
            />
          ))}
        </ScrollView>
      )}

      <ReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />

      <RejectSheet
        visible={!!rejecting}
        onClose={() => setRejecting(null)}
        onReject={onReject}
        saving={reviewMut.isPending}
      />
    </SafeAreaView>
  );
}

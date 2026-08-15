import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/ui/icon-chip";
import { useShopPlan, usePlansList } from "@/features/billing/use-plan";
import { useActivePayment } from "@/features/billing/use-payments";
import { statusLabelKey, statusTone } from "@/features/billing/payment-status";
import { daysUntil } from "@/features/billing/plan-math";
import type { PlanLimits, PlanRow } from "@/features/billing/billing-api";
import { FeedbackSheet } from "@/features/feedback/feedback-sheet";

const LIMIT_ROWS: { key: keyof PlanLimits; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { key: "products", icon: "cube-outline", labelKey: "billing.limitProducts" },
  { key: "members", icon: "people-outline", labelKey: "billing.limitMembers" },
  { key: "shops", icon: "storefront-outline", labelKey: "billing.limitShops" },
  { key: "ai_daily", icon: "sparkles-outline", labelKey: "billing.limitAi" },
];

/** Joriy do'kon holati — tepadagi katta karta. */
function CurrentStatusCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useShopPlan();

  if (isLoading || !data) {
    return (
      <Card elevated style={{ marginBottom: 18 }}>
        <Skeleton height={70} />
      </Card>
    );
  }

  const tone = data.expired ? "danger" : data.status === "trialing" ? "warning" : "success";
  const days = data.status === "trialing" ? daysUntil(data.trialEndsAt) : daysUntil(data.currentPeriodEnd);

  return (
    <Card tone={data.expired ? "danger" : "brand"} elevated style={{ marginBottom: 18, gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-medium text-ink">
          {t(`billing.plan.${data.planCode}`)}
        </Text>
        <Badge
          label={t(
            data.expired
              ? "billing.statusExpired"
              : data.status === "trialing"
                ? "billing.statusTrialing"
                : "billing.statusActive",
          )}
          tone={tone}
        />
      </View>
      {data.expired ? (
        <Text className="text-sm text-muted">{t("billing.expiredHint")}</Text>
      ) : data.status === "trialing" ? (
        <Text className="text-sm text-muted">{t("billing.trialEndsIn", { days })}</Text>
      ) : data.currentPeriodEnd ? (
        <Text className="text-sm text-muted">{t("billing.periodEndsIn", { days })}</Text>
      ) : null}
    </Card>
  );
}

function LimitValue({ value }: { value: number | null }) {
  const { t } = useTranslation();
  return (
    <Text className="text-sm font-medium text-ink">
      {value === null ? t("billing.unlimited") : value}
    </Text>
  );
}

/**
 * Bitta tarif kartasi (Free/Pro/Ultra) — joriy tarif ustiga urg'u beriladi.
 *
 * Free (narxi 0) sotib olinmaydi — unda tugma umuman ko'rinmaydi (server
 * ham `plan_not_purchasable` bilan rad etadi, bu UI qatlami).
 */
function PlanCard({
  plan,
  isCurrent,
  onChoose,
}: {
  plan: PlanRow;
  isCurrent: boolean;
  onChoose: (period: "month" | "year") => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const purchasable = plan.priceMonth > 0;

  return (
    <Card
      tone={isCurrent ? "brand" : "default"}
      elevated={isCurrent}
      style={{ marginBottom: 12, gap: 12 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-medium text-ink">{t(plan.nameKey)}</Text>
        {isCurrent ? <Badge label={t("billing.currentPlanChip")} tone="brand" /> : null}
      </View>

      <View className="flex-row items-baseline gap-1">
        <Text style={{ fontSize: text.xl2, fontWeight: "800", color: colors.ink }}>
          {plan.priceMonth === 0 ? t("billing.free") : formatCurrency(plan.priceMonth)}
        </Text>
        {plan.priceMonth > 0 ? (
          <Text className="text-sm text-muted">{t("billing.perMonth")}</Text>
        ) : null}
      </View>

      <View style={{ gap: 8, marginTop: 4 }}>
        {LIMIT_ROWS.map((row) => (
          <View key={row.key} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name={row.icon} size={16} color={colors.muted} />
              <Text className="text-sm text-muted">{t(row.labelKey)}</Text>
            </View>
            <LimitValue value={plan.limits[row.key]} />
          </View>
        ))}
      </View>

      {purchasable ? (
        <View style={{ gap: space.sm, marginTop: 4 }}>
          <Button
            label={isCurrent ? t("billing.extendBtn") : t("billing.subscribeBtn")}
            onPress={() => onChoose("month")}
          />
          {plan.priceYear > 0 ? (
            <Pressable
              onPress={() => onChoose("year")}
              accessibilityRole="button"
              accessibilityLabel={t("billing.yearlyOption", {
                price: formatCurrency(plan.priceYear),
              })}
              style={{
                height: 44,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.primary }}>
                {t("billing.yearlyOption", { price: formatCurrency(plan.priceYear) })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Tekshiruvda turgan to'lov banneri.
 *
 * ATAYLAB faqat `reviewing` holatida: `pending` — bu "foydalanuvchi
 * checkout'ni ochgan, lekin hali chek yubormagan" holati va uni banner
 * bilan eslatib turish chalkashtiradi (qurilmada tasdiqlangan: "men hech
 * narsa yubormadim, nega davom etayotgan to'lov deyapti?"). Chek
 * yuborilgach esa banner haqiqiy ma'no kasb etadi — javob kutilmoqda.
 */
function ActivePaymentBanner({ onOpen }: { onOpen: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { data: payment } = useActivePayment();

  if (!payment || payment.status !== "reviewing") return null;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("billing.activePaymentTitle")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.lg,
        marginBottom: 18,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.warning,
        backgroundColor: colors.warningTint,
      }}
    >
      <IconChip icon="time-outline" tone="warning" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: text.sm, fontWeight: "700", color: colors.ink }}>
          {t("billing.activePaymentTitle")}
        </Text>
        <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
          {t(`billing.plan.${payment.plan_code}`)} · {formatCurrency(payment.amount)}
        </Text>
      </View>
      <Badge label={t(statusLabelKey(payment.status))} tone={statusTone(payment.status)} />
      <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
    </Pressable>
  );
}

/**
 * Tarif ekrani — joriy holat + Free/Pro/Ultra taqqoslash + sotib olish.
 *
 * To'lov ilgari ilovada umuman yo'q edi ("Tarifni yangilash" faqat
 * `FeedbackSheet` ochardi). Endi tarif tanlanganda `/checkout` ochiladi:
 * karta rekvizitlari → chek yuklash → admin tekshiruvi (045-migratsiya).
 * Fikr-mulohaza kanali savol/muammo uchun pastda qoladi.
 */
export default function SubscriptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: currentPlan } = useShopPlan();
  const { data: plans, isLoading: plansLoading } = usePlansList();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  function openCheckout(planCode: string, period: "month" | "year") {
    router.push(`/checkout?plan=${planCode}&period=${period}` as Href);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("billing.title")} />
      <ScrollView className="flex-1">
        <View className="px-4 pb-10 pt-4">
          <CurrentStatusCard />

          <ActivePaymentBanner onOpen={() => router.push("/checkout" as Href)} />

          {plansLoading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={180} />
              <Skeleton height={180} />
              <Skeleton height={180} />
            </View>
          ) : (
            (plans ?? []).map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                isCurrent={plan.code === currentPlan?.planCode}
                onChoose={(period) => openCheckout(plan.code, period)}
              />
            ))
          )}

          <Button
            label={t("billing.upgradeBtn")}
            onPress={() => setFeedbackOpen(true)}
            variant="ghost"
          />
          <Text className="mt-2 text-center text-xs text-muted">{t("billing.upgradeHint")}</Text>
        </View>
      </ScrollView>

      <FeedbackSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        initialMessage={t("billing.upgradeMessage")}
      />
    </SafeAreaView>
  );
}

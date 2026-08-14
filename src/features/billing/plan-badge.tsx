import { useTranslation } from "react-i18next";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { useShopPlan } from "./use-plan";
import { daysUntil } from "./plan-math";

/**
 * Joriy tarif nishoni — "Pro · 5 kun qoldi" / "Free" / "Muddati tugadi".
 * Sozlamalar/tarif ekranida va Ko'proq menyusida ishlatiladi.
 */
export function PlanBadge() {
  const { data } = useShopPlan();
  const { t } = useTranslation();

  if (!data) return null;

  let label: string;
  let tone: BadgeTone = "brand";

  if (data.expired) {
    label = t("billing.badgeExpired");
    tone = "danger";
  } else if (data.status === "trialing") {
    const days = daysUntil(data.trialEndsAt);
    label = t("billing.badgeTrial", { days });
    tone = days <= 3 ? "warning" : "brand";
  } else {
    label = t(`billing.plan.${data.effectivePlanCode}`);
    tone = data.effectivePlanCode === "free" ? "neutral" : "brand";
  }

  return <Badge label={label} tone={tone} icon="sparkles-outline" />;
}

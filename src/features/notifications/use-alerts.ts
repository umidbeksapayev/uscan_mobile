import { useMemo } from "react";

import { useActivePermissions } from "@/features/auth/use-memberships";
import { useMyInvites } from "@/features/auth/use-invites";
import { useCustomersWithBalance } from "@/features/customers/use-customers";
import { useLowStockProducts } from "@/features/dashboard/use-dashboard";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { useAnomalies } from "./anomaly-api";
import { alertBadgeCount, buildAlerts, type AlertDescriptor } from "./alerts-math";

/**
 * Bildirishnomalar markazi ma'lumoti.
 *
 * Kam qoldiq/qarzdorlar mavjud query key'lardan foydalanadi
 * (`dashboard/low-stock`, `customers`), shuning uchun React Query keshni
 * Bosh sahifa va Nasiya ekrani bilan bo'lishadi. Anomaliyalar (`useAnomalies`)
 * yagona qo'shimcha so'rov — faqat egasida, 15 daqiqalik `staleTime` bilan
 * (arzon, lekin real vaqtda ham shart emas).
 *
 * Takliflar (`useMyInvites`) rolga bog'liq EMAS — ega ham boshqa do'konga
 * kassir sifatida taklif qilinishi mumkin (ko'p-do'konli a'zolik). Onboarding
 * "kutish" ekrani faqat do'koni yo'q foydalanuvchida ko'rinadi — allaqachon
 * do'koni bor foydalanuvchi shu qo'ng'iroqcha/bildirishnoma markazi orqali
 * bilishi kerak, aks holda taklif hech qachon ko'rinmay qolardi.
 */
export function useAlerts(): { alerts: AlertDescriptor[]; badge: number } {
  const { canManageDebt, isOwner } = useActivePermissions();
  const unsyncedCount = useOfflineStore((s) => s.pendingCount);
  const { data: lowStock } = useLowStockProducts();
  // Ruxsat bo'lmasa so'rov umuman yuborilmaydi.
  const { data: customers } = useCustomersWithBalance(canManageDebt);
  const { data: anomalies } = useAnomalies(isOwner);
  const { data: myInvites } = useMyInvites();

  const lowStockCount = lowStock?.length ?? 0;
  const invitesCount = myInvites?.length ?? 0;
  const debtorCount = useMemo(
    () => customers?.filter((c) => c.balance > 0).length ?? 0,
    [customers],
  );

  const alerts = useMemo(
    () =>
      buildAlerts({
        unsyncedCount,
        invitesCount,
        lowStockCount,
        debtorCount,
        canManageDebt,
        isOwner,
        lossSalesCount: anomalies?.loss_sales_count ?? 0,
        returnsSpike: anomalies?.returns_spike ?? false,
        returnsToday: anomalies?.returns_today ?? 0,
        cashShortfallCount: anomalies?.cash_shortfall_count ?? 0,
      }),
    [unsyncedCount, invitesCount, lowStockCount, debtorCount, canManageDebt, isOwner, anomalies],
  );

  return { alerts, badge: alertBadgeCount(alerts) };
}

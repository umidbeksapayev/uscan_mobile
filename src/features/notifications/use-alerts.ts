import { useMemo } from "react";

import { useActivePermissions } from "@/features/auth/use-memberships";
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
 */
export function useAlerts(): { alerts: AlertDescriptor[]; badge: number } {
  const { canManageDebt, isOwner } = useActivePermissions();
  const unsyncedCount = useOfflineStore((s) => s.pendingCount);
  const { data: lowStock } = useLowStockProducts();
  // Ruxsat bo'lmasa so'rov umuman yuborilmaydi.
  const { data: customers } = useCustomersWithBalance(canManageDebt);
  const { data: anomalies } = useAnomalies(isOwner);

  const lowStockCount = lowStock?.length ?? 0;
  const debtorCount = useMemo(
    () => customers?.filter((c) => c.balance > 0).length ?? 0,
    [customers],
  );

  const alerts = useMemo(
    () =>
      buildAlerts({
        unsyncedCount,
        lowStockCount,
        debtorCount,
        canManageDebt,
        isOwner,
        lossSalesCount: anomalies?.loss_sales_count ?? 0,
        returnsSpike: anomalies?.returns_spike ?? false,
        returnsToday: anomalies?.returns_today ?? 0,
        cashShortfallCount: anomalies?.cash_shortfall_count ?? 0,
      }),
    [unsyncedCount, lowStockCount, debtorCount, canManageDebt, isOwner, anomalies],
  );

  return { alerts, badge: alertBadgeCount(alerts) };
}

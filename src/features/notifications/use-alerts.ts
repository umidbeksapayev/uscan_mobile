import { useMemo } from "react";

import { useActivePermissions } from "@/features/auth/use-memberships";
import { useCustomersWithBalance } from "@/features/customers/use-customers";
import { useLowStockProducts } from "@/features/dashboard/use-dashboard";
import { useOfflineStore } from "@/lib/offline/offline-store";
import { alertBadgeCount, buildAlerts, type AlertDescriptor } from "./alerts-math";

/**
 * Bildirishnomalar markazi ma'lumoti.
 *
 * Yangi so'rov QO'SHMAYDI — mavjud query key'lardan foydalanadi
 * (`dashboard/low-stock`, `customers`), shuning uchun React Query keshni
 * Bosh sahifa va Nasiya ekrani bilan bo'lishadi. Qo'ng'iroqcha sanog'i
 * uchun qo'shimcha tarmoq trafigi ketmaydi.
 */
export function useAlerts(): { alerts: AlertDescriptor[]; badge: number } {
  const { canManageDebt } = useActivePermissions();
  const unsyncedCount = useOfflineStore((s) => s.pendingCount);
  const { data: lowStock } = useLowStockProducts();
  // Ruxsat bo'lmasa so'rov umuman yuborilmaydi.
  const { data: customers } = useCustomersWithBalance(canManageDebt);

  const lowStockCount = lowStock?.length ?? 0;
  const debtorCount = useMemo(
    () => customers?.filter((c) => c.balance > 0).length ?? 0,
    [customers],
  );

  const alerts = useMemo(
    () => buildAlerts({ unsyncedCount, lowStockCount, debtorCount, canManageDebt }),
    [unsyncedCount, lowStockCount, debtorCount, canManageDebt],
  );

  return { alerts, badge: alertBadgeCount(alerts) };
}

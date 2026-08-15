import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveShopId } from "@/features/auth/use-memberships";
import type { PaymentStatus, RejectionCode } from "./payment-status";
import {
  adminListPayments,
  adminReviewPayment,
  cancelPayment,
  checkIsSuperAdmin,
  createPayment,
  getActivePayment,
  listMyPayments,
  submitReceipt,
} from "./payments-api";

/**
 * To'lov tasdiqlangach obuna o'zgaradi — shu ikkala keshni birga
 * yangilaymiz. `plan` kaliti butun ilova bo'ylab limitlarni boshqaradi
 * (`use-plan.ts`), shuning uchun uni eskirgan qoldirish mumkin emas.
 */
function invalidateBilling(qc: ReturnType<typeof useQueryClient>, shopId?: string) {
  void qc.invalidateQueries({ queryKey: ["payments"] });
  void qc.invalidateQueries({ queryKey: ["plan", shopId] });
}

/** Do'konning davom etayotgan to'lovi (pending/reviewing) — checkout ekrani. */
export function useActivePayment() {
  const shopId = useActiveShopId();

  return useQuery({
    queryKey: ["payments", "active", shopId],
    queryFn: () => getActivePayment(shopId!),
    enabled: !!shopId,
    // Tekshiruv admin tomonida bo'ladi — foydalanuvchi ekranni ochiq
    // qoldirsa holat o'zgarganini ko'rsin, lekin tez-tez ham so'ramaylik.
    staleTime: 15_000,
  });
}

/** To'lovlar tarixi (oxirgi 20 ta). */
export function useMyPayments() {
  const shopId = useActiveShopId();

  return useQuery({
    queryKey: ["payments", "list", shopId],
    queryFn: () => listMyPayments(shopId!),
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

/** Tarif tanlandi → to'lov niyati (mavjud bo'lsa o'sha qaytadi). */
export function useCreatePayment() {
  const qc = useQueryClient();
  const shopId = useActiveShopId();

  return useMutation({
    mutationFn: ({ planCode, period }: { planCode: string; period: "month" | "year" }) =>
      createPayment(shopId!, planCode, period),
    meta: { name: "create-payment" },
    onSuccess: () => invalidateBilling(qc, shopId),
  });
}

/** Chek yuborildi → `reviewing`. */
export function useSubmitReceipt() {
  const qc = useQueryClient();
  const shopId = useActiveShopId();

  return useMutation({
    mutationFn: (args: {
      paymentId: string;
      channel: "upload" | "telegram";
      path?: string | null;
      reference?: string | null;
    }) => submitReceipt(args),
    meta: { name: "submit-receipt" },
    onSuccess: () => invalidateBilling(qc, shopId),
  });
}

export function useCancelPayment() {
  const qc = useQueryClient();
  const shopId = useActiveShopId();

  return useMutation({
    mutationFn: (paymentId: string) => cancelPayment(paymentId),
    meta: { name: "cancel-payment" },
    onSuccess: () => invalidateBilling(qc, shopId),
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Admin (super_admin)
───────────────────────────────────────────────────────────────────────── */

/**
 * Joriy foydalanuvchi super_admin'mi. Menyuda "To'lovlar" bandini
 * ko'rsatish uchun — haqiqiy himoya serverda (`is_super_admin()` har bir
 * RPC ichida), bu faqat UX qatlami.
 */
export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: checkIsSuperAdmin,
    staleTime: 10 * 60_000,
  });
}

export function useAdminPayments(status?: PaymentStatus) {
  return useQuery({
    queryKey: ["payments", "admin", status ?? "all"],
    queryFn: () => adminListPayments(status),
    staleTime: 15_000,
  });
}

export function useAdminReviewPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      paymentId: string;
      approve: boolean;
      rejectionCode?: RejectionCode | null;
      rejectionText?: string | null;
    }) => adminReviewPayment(args),
    meta: { name: "admin-review-payment" },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      // Boshqa do'konning obunasi o'zgardi — o'z `plan` keshimizga tegmaydi,
      // lekin admin o'zi ham do'kon egasi bo'lishi mumkin (o'z to'lovini
      // tasdiqlagan holat) — shuning uchun baribir yangilaymiz.
      void qc.invalidateQueries({ queryKey: ["plan"] });
    },
  });
}

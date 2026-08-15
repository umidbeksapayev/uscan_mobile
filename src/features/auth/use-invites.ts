import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MemberRole } from "@/types/database";
import { useAuth } from "./auth-context";
import {
  inviteShopMember,
  cancelShopInvite,
  listShopInvites,
  listMyInvites,
  respondShopInvite,
} from "./invites-api";

/** Ega: o'z do'konining kutilayotgan takliflari (staff.tsx). */
export function useShopInvites(shopId: string | undefined) {
  return useQuery({
    queryKey: ["shop-invites", shopId],
    enabled: !!shopId,
    queryFn: () => listShopInvites(shopId!),
  });
}

export function useInviteMember(shopId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: MemberRole }) =>
      inviteShopMember(shopId!, email, role),
    meta: { name: "invite-member" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-invites", shopId] }),
  });
}

export function useCancelInvite(shopId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => cancelShopInvite(inviteId),
    meta: { name: "cancel-invite" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-invites", shopId] }),
  });
}

/** Taklif qilingan: o'ziga kelgan takliflar — onboarding "kutish" ekrani. */
export function useMyInvites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["my-invites", session?.user.id],
    enabled: !!session,
    queryFn: () => listMyInvites(),
  });
}

/**
 * Qabul/rad etish. Qabul qilinganda `memberships` ham eskirgan bo'ladi —
 * shuni invalidatsiya qilish `AuthGate`ni (tabs)ga o'tkazadi (qo'lda
 * yo'naltirish shart emas, `onboarding-store.ts`dagi naqshga mos).
 */
export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, accept }: { inviteId: string; accept: boolean }) =>
      respondShopInvite(inviteId, accept),
    meta: { name: "respond-invite" },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["my-invites"] });
      if (result.accepted) {
        void qc.invalidateQueries({ queryKey: ["memberships"] });
      }
    },
  });
}

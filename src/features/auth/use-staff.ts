import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MemberPermissions } from "@/types/database";
import {
  listShopMembers,
  addShopMember,
  removeShopMember,
  setMemberPermissions,
} from "./staff-api";

/** Faol do'kon xodimlari (faqat ega ko'radi — RPC RLS bilan gate qiladi). */
export function useStaff(shopId: string | undefined) {
  return useQuery({
    queryKey: ["staff", shopId],
    enabled: !!shopId,
    queryFn: () => listShopMembers(shopId!),
  });
}

export function useAddMember(shopId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => addShopMember(shopId!, email, "cashier"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", shopId] }),
  });
}

export function useRemoveMember(shopId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeShopMember(shopId!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", shopId] }),
  });
}

export function useSetPermissions(shopId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; permissions: MemberPermissions }) =>
      setMemberPermissions(shopId!, args.userId, args.permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", shopId] }),
  });
}

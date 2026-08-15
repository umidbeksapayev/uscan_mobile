import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/auth-context";
import { getMyProfile, updateMyProfile } from "./profile-api";

/**
 * O'z profili. `koproq.tsx` (foydalanuvchi kartasi) va `/profile` ikkalasi
 * ham shu so'rovni ishlatadi — kesh bitta, ism/rasm o'zgarsa ikkala joyda
 * birdan yangilanadi.
 */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: () => getMyProfile(userId!),
    // Profil kamdan-kam o'zgaradi — har ekran ochilganda qayta so'ramaymiz.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (input: { fullName?: string | null; avatarUrl?: string | null }) =>
      updateMyProfile(input),
    meta: { name: "update-profile" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", session?.user.id] }),
  });
}

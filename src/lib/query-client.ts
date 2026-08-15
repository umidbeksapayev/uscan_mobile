import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { logError } from "@/lib/logger";

/**
 * Markazlashtirilgan xato jurnali (A5 naqshiga mos) — ilgari har bir so'rov
 * o'z xatosini jim yutar edi (masalan `useAlerts` badge hisoblovchilari:
 * `data?.length ?? 0`), Diagnostika'da esa hech narsa ko'rinmasdi. Endi
 * BARCHA muvaffaqiyatsiz so'rovlar shu yerdan Diagnostika jurnaliga tushadi
 * — UI hali ham jim qoladi (badge shunchaki 0 ko'rsatadi), lekin sabab endi
 * qurilmada ko'rinadi.
 *
 * Mutation'lar (`useMutation`) alohida — ularning o'zida odatda `onError`
 * bilan foydalanuvchiga tushunarli xabar ko'rsatiladi (masalan
 * `inviteErrorMessage`), lekin xom (texnik) matn hech qayerga yozilmasdi —
 * shuning uchun xato SABABINI tushunish uchun bu yerda ham jurnallanadi,
 * UI xabari o'zgarmaydi.
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    logError(`query:${String(query.queryKey[0])}`, error);
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    const key = mutation.options.mutationKey?.[0];
    logError(`mutation:${key ? String(key) : mutation.meta?.name ?? "unknown"}`, error);
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

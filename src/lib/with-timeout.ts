/**
 * Promise'ni muhlat bilan o'raydi — ba'zi tarmoq/uchinchi-tomon SDK
 * chaqiruvlari (masalan GoTrueClient RN'da, `lib/supabase.ts`dagi
 * `noopLock` izohiga qarang, yoki sekin tarmoqda oddiy REST so'rovi)
 * abadiy osilib qolishi mumkin — ekran ham abadiy kutib qolmasligi kerak.
 *
 * Diqqat: bu faqat KUTISHNI to'xtatadi, asl so'rovni bekor qilmaydi (JS
 * promise'lari bekor qilinmaydi) — u orqa fonda davom etaveradi va natijasi
 * chaqiruvchi tomonda e'tiborga olinmay qoladi.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, timeoutMessage = "timeout"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms)),
  ]);
}

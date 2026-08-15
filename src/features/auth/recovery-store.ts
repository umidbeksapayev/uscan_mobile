import { create } from "zustand";

/**
 * Parolni tiklash oqimining bosqichi.
 *
 * `idle`         — havola hali ishlanmadi (ekran endi ochildi)
 * `establishing` — token topildi, `setSession()` ketmoqda
 * `ready`        — sessiya o'rnatildi, yangi parol kutilmoqda
 * `invalid`      — havola yaroqsiz/muddati o'tgan (sabab `error`da)
 * `done`         — yangi parol saqlandi, AuthGate yo'naltiradi
 */
export type RecoveryPhase = "idle" | "establishing" | "ready" | "invalid" | "done";

interface RecoveryState {
  /**
   * Bosqich ATAYLAB do'konda (ekran ichida `useState` emas): sessiya
   * o'rnatilganda AuthGate butun ekran daraxtini `key` orqali qayta
   * yaratadi (`auth-gate.tsx`) — ekran mount'i yo'qoladi. Holat ekran
   * ichida bo'lganda oqim aynan shu joyda uzilib, foydalanuvchi to'g'ri
   * havola bilan ham "yaroqsiz" xabarini ko'rardi (qurilmada tasdiqlangan).
   */
  phase: RecoveryPhase;
  /** `invalid` bo'lganda ko'rsatiladigan sabab (null — umumiy matn). */
  error: string | null;
  /**
   * Parolni tiklash havolasi orqali kirilganda true. `setSession()` chaqirilgach
   * `SIGNED_IN` hodisasi chiqadi (Supabase implicit-flow'da `setSession()`
   * hech qachon `PASSWORD_RECOVERY` chiqarmaydi — faqat `verifyOtp`/avtomatik
   * URL-aniqlashda, biz esa uni qo'lda ishlatamiz). Shuning uchun AuthGate'ga
   * "sessiya bor, lekin hali (tabs)ga o'tkazma — foydalanuvchi yangi parol
   * kiritishi kerak" deb aytish uchun alohida bayroq kerak.
   */
  active: boolean;
  setPhase: (phase: RecoveryPhase, error?: string | null) => void;
}

export const useRecoveryStore = create<RecoveryState>((set) => ({
  phase: "idle",
  error: null,
  active: false,
  setPhase: (phase, error = null) =>
    set({
      phase,
      error,
      // Oqim tugagan (`done`) yoki uzilgan (`invalid`) holatda bayroq
      // TUSHISHI shart — aks holda AuthGate hech qachon yo'naltirmay,
      // foydalanuvchi sessiyasi bor bo'la turib auth ekranlarida qolardi.
      active: phase === "establishing" || phase === "ready",
    }),
}));

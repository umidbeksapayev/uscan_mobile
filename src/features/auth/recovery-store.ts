import { create } from "zustand";

interface RecoveryState {
  /**
   * Parolni tiklash havolasi orqali kirilganda true. `setSession()` chaqirilgach
   * `SIGNED_IN` hodisasi chiqadi (Supabase implicit-flow'da `setSession()`
   * hech qachon `PASSWORD_RECOVERY` chiqarmaydi — faqat `verifyOtp`/avtomatik
   * URL-aniqlashda, biz esa uni qo'lda ishlatamiz). Shuning uchun AuthGate'ga
   * "sessiya bor, lekin hali (tabs)ga o'tkazma — foydalanuvchi yangi parol
   * kiritishi kerak" deb aytish uchun alohida bayroq kerak.
   */
  active: boolean;
  setActive: (v: boolean) => void;
}

export const useRecoveryStore = create<RecoveryState>((set) => ({
  active: false,
  setActive: (v) => set({ active: v }),
}));

import { create } from "zustand";

interface OnboardingState {
  /**
   * Do'kon yaratildi, lekin foydalanuvchi hali yakuniy ("Tayyor") ekranini
   * ko'rmadi. `AuthGate` uchun bayroq — busiz `memberships` keshi yangilangan
   * zahoti "do'kon bor + onboarding guruhidamiz" deb (tabs)ga uloqtirardi va
   * 3-qadam miltillab o'tib ketardi.
   *
   * `recovery-store.ts` bilan bir xil naqsh va bir xil sabab: sessiya/a'zolik
   * holati o'zgardi, lekin oqim hali tugamagan.
   *
   * Ataylab MMKV'ga yozilmaydi — ilova o'ldirilsa bayroq yo'qoladi va
   * keyingi kirishda AuthGate to'g'ri ishlaydi (do'kon bor → tabs).
   */
  completing: boolean;
  setCompleting: (v: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completing: false,
  setCompleting: (v) => set({ completing: v }),
}));

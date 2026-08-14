import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";

import { supabase } from "@/lib/supabase";

/**
 * Google Cloud Console'da yaratilgan "Web application" turidagi OAuth
 * mijozining Client ID'si — Android native oqimida ham SHU (Android emas!)
 * ishlatiladi, chunki Supabase `signInWithIdToken` faqat shu audience uchun
 * chiqarilgan ID token'ni tekshira oladi. Supabase Dashboard → Authentication
 * → Providers → Google'dagi Client ID bilan bir xil bo'lishi shart.
 */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleSignInConfigured = Boolean(webClientId);

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId, offlineAccess: false });
  configured = true;
}

export type GoogleSignInErrorCode =
  | "not_configured"
  | "cancelled"
  | "in_progress"
  | "play_services"
  | "no_id_token"
  | "supabase";

export class GoogleSignInError extends Error {
  code: GoogleSignInErrorCode;
  constructor(code: GoogleSignInErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Google native SDK bilan bitta bosishda kirish/ro'yxatdan o'tish (brauzer
 * ochilmaydi). Muvaffaqiyatli bo'lsa Supabase sessiyasi o'rnatiladi —
 * AuthGate qolganini bajaradi (email/parol bilan kirishdagi kabi).
 *
 * Email/parol bilan avval ro'yxatdan o'tgan foydalanuvchi keyin xuddi shu
 * (tasdiqlangan) email bilan Google orqali kirsa — Supabase identity'ni
 * bitta userga avtomatik bog'laydi, dublikat akkaunt yaratilmaydi.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!webClientId) {
    throw new GoogleSignInError(
      "not_configured",
      "Google kirish sozlanmagan (.env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).",
    );
  }
  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === "cancelled") {
      throw new GoogleSignInError("cancelled", "Bekor qilindi.");
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new GoogleSignInError("no_id_token", "Google ID token olinmadi.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) {
      throw new GoogleSignInError("supabase", error.message);
    }
    // Muvaffaqiyat → AuthGate sessiyani ko'rib avtomatik yo'naltiradi.
  } catch (e) {
    if (e instanceof GoogleSignInError) throw e;

    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleSignInError("cancelled", "Bekor qilindi.");
      }
      if (e.code === statusCodes.IN_PROGRESS) {
        throw new GoogleSignInError("in_progress", "Kirish jarayoni allaqachon davom etmoqda.");
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError(
          "play_services",
          "Google Play Services mavjud emas yoki eskirgan.",
        );
      }
    }
    throw new GoogleSignInError("supabase", e instanceof Error ? e.message : String(e));
  }
}

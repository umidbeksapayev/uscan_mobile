import * as Linking from "expo-linking";
import { create } from "zustand";

import { logError } from "./logger";
import { describeAuthUrl } from "@/features/auth/parse-auth-url";

/**
 * Ilovaga kelgan oxirgi deep-link — REAKTIV do'kon (zustand).
 *
 * Nega shunday murakkab (qurilmada uch bosqichda aniqlangan):
 *
 *  1. `Linking.useURL()` / `getInitialURL()` faqat ilova YOPIQ bo'lganda
 *     ishonchli. Ilova ochiq bo'lsa URL `url` hodisasi bilan keladi va
 *     ekran unga kech obuna bo'lib, butunlay o'tkazib yuborardi
 *     (jurnalda: `useURL: url=null | initial: url=null`).
 *
 *  2. Obunani modul darajasiga ko'chirish yetarli bo'lmadi: oddiy
 *     o'zgaruvchidan ekran qiymatni FAQAT mount paytida bir marta
 *     o'qiydi. Havola ekran ochilgandan keyin kelsa (yoki o'qish undan
 *     oldin bo'lsa) — baribir `null` ko'rinadi.
 *
 *  3. Havolani "ishlatildi" deb do'konni TOZALASH (`setUrl(null)`) o'zi
 *     xatoga aylandi: qiymat reaktiv bo'lgani uchun tozalash ekran
 *     effektini QAYTA ishga tushirardi — endi havola yo'q, ekran esa
 *     "yaroqsiz havola" deb ko'rsatardi (aslida token to'g'ri edi va
 *     sessiya orqa fonda o'rnatilardi). Shuning uchun ishlatilgan havola
 *     endi o'chirilmaydi, balki REAKTIV BO'LMAGAN modul o'zgaruvchisida
 *     belgilanadi — hech qanday qayta render kelib chiqmaydi.
 *
 * Modul `app/_layout.tsx` da import qilinadi — import qilinishining o'zi
 * obunani o'rnatadi (birinchi ekran mount bo'lishidan oldin).
 */
interface DeepLinkState {
  url: string | null;
  setUrl: (url: string | null) => void;
}

export const useDeepLinkStore = create<DeepLinkState>((set) => ({
  url: null,
  setUrl: (url) => set({ url }),
}));

/**
 * Token'i sarflangan havolalar. ATAYLAB zustand emas — bu faqat "qayta
 * ishlama" bayrog'i, uni reaktiv qilish yuqoridagi 3-band xatosini
 * qaytaradi. Modul o'zgaruvchisi ekran qayta mount bo'lganda ham saqlanadi
 * (AuthGate sessiya paydo bo'lganda butun daraxtni qayta yaratadi) va
 * faqat ilova sovuq ishga tushganda tozalanadi — aynan shu kerak.
 */
const consumedUrls = new Set<string>();

Linking.addEventListener("url", ({ url }) => {
  logError("deepLink.event", describeAuthUrl(url));
  useDeepLinkStore.getState().setUrl(url);
});

// Sovuq start yo'li. Hodisa allaqachon URL yozgan bo'lsa ustidan yozmaymiz.
void Linking.getInitialURL().then((url) => {
  logError("deepLink.initial", describeAuthUrl(url));
  if (url && !useDeepLinkStore.getState().url) {
    useDeepLinkStore.getState().setUrl(url);
  }
});

/**
 * Havolani "ishlatilgan" deb belgilaydi — bir martalik token qayta
 * ishlatilmasin (masalan foydalanuvchi keyinroq shu ekranga qo'lda qaytsa,
 * eski havola bilan "yaroqsiz" xatosi chiqmasligi kerak).
 *
 * Atomar: `true` faqat BIRINCHI chaqiruvda qaytadi. Ekran effekti bir necha
 * marta parallel ishga tushishi mumkin (har render'da) — shu qaytish qiymati
 * bitta token bo'yicha ikkita `setSession()` ketishining oldini oladi.
 */
export function consumeDeepLink(url: string | null | undefined): boolean {
  if (!url || consumedUrls.has(url)) return false;
  consumedUrls.add(url);
  return true;
}

/** Havola allaqachon ishlatilganmi (token'i sarflanganmi). */
export function isDeepLinkConsumed(url: string | null | undefined): boolean {
  return Boolean(url) && consumedUrls.has(url as string);
}

import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Buferga nusxalash — native modul YO'Q bo'lsa ham ishlaydi.
 *
 * Ikki bosqichli:
 *  1. `expo-clipboard` native moduli (yangi build) — asosiy yo'l.
 *  2. React Native yadrosidagi eski `Clipboard` — u RN 0.81 da hali mavjud
 *     (eskirgan deb belgilangan, lekin OLIB TASHLANMAGAN) va MAVJUD
 *     build'da ham ishlaydi, ya'ni yangi EAS build kutmasdan nusxalash
 *     ishlaydi. Konsolda eskirish ogohlantirishi chiqadi — bu kutilgan.
 *
 * Nega `expo-clipboard`ni to'g'ridan-to'g'ri import qilmaymiz: u ichida
 * `requireNativeModule('ExpoClipboard')` chaqiradi va modul bo'lmasa
 * (eski dev build) modul yuklanishida OTADI — butun ekran qulaydi.
 * Dinamik `import()` ham yetarli emas: Metro'ning async require'i ichida
 * xato promise'dan tashqariga chiqib qizil ekran beradi (qurilmada
 * tasdiqlangan). `requireOptionalNativeModule` esa aynan shu holat uchun:
 * modul bo'lmasa `null` qaytaradi, hech narsa otmaydi.
 */
interface ClipboardNativeModule {
  setStringAsync: (text: string, options?: Record<string, unknown>) => Promise<boolean | void>;
}

const ExpoClipboard = requireOptionalNativeModule<ClipboardNativeModule>("ExpoClipboard");

/** RN yadrosidagi eskirgan `Clipboard` — faqat zaxira yo'lda o'qiladi
 *  (getter'ga tegilganda eskirish ogohlantirishi chiqadi). */
function legacyClipboard(): { setString: (t: string) => void } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RN = require("react-native") as { Clipboard?: { setString: (t: string) => void } };
    return RN.Clipboard ?? null;
  } catch {
    return null;
  }
}

/**
 * `true` = nusxalandi. `false` bo'lsa chaqiruvchi qiymatni ekranda ko'rsatadi.
 *
 * Zaxira yo'l (RN yadrosi) FAQAT haqiqiy nusxalash paytida tegiladi —
 * modul yuklanishida emas. Aks holda `react-native`ning `Clipboard`
 * getter'i ilova ochilishidayoq eskirish ogohlantirishini chiqarardi,
 * hatto `expo-clipboard` mavjud bo'lganda ham.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  if (ExpoClipboard?.setStringAsync) {
    try {
      await ExpoClipboard.setStringAsync(value, {});
      return true;
    } catch {
      // Zaxira yo'lga tushamiz (pastda).
    }
  }

  const legacy = legacyClipboard();
  if (legacy?.setString) {
    try {
      legacy.setString(value);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

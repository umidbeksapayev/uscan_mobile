import { Platform } from "react-native";
import Constants from "expo-constants";

import { meta } from "@/lib/offline/mmkv";
import { logError } from "@/lib/logger";
import { withTimeout } from "@/lib/with-timeout";
import { supabase } from "@/lib/supabase";
import {
  SLOT_TIME,
  nextOccurrence,
  shouldNotifyLowStock,
  tashkentDateString,
  type ReminderSlot,
} from "./notify-math";

/** MMKV kalitlari (lokal bildirishnoma sozlamalari). */
export const NotifKeys = {
  dailySlot: "notifDailySlot", // ReminderSlot
  lowStockDate: "notifLowStockDate", // yyyy-mm-dd (Toshkent)
  pushToken: "notifPushToken", // oxirgi ro'yxatdan o'tkazilgan Expo token
} as const;

const DAILY_ID = "daily-summary";
const LOW_STOCK_ID = "low-stock";

/**
 * expo-notifications'ni XAVFSIZ yuklash. Eski dev build'da (native modul yo'q)
 * import o'zi otadi — ExpoCrypto bilan bo'lgani kabi (fix #21). Dinamik import +
 * catch: modul bo'lmasa null qaytadi, funksiya jim o'chadi (ilova qulamaydi).
 */
async function loadNotifications() {
  try {
    return await import("expo-notifications");
  } catch (e) {
    logError("notify.moduleMissing", e);
    return null;
  }
}

/** Ruxsat so'raydi (Android 13+ dialog) + kanal sozlaydi. false = rad/modul yo'q. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const N = await loadNotifications();
  if (!N) return false;
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "Eslatmalar",
      importance: N.AndroidImportance.DEFAULT,
    }).catch((e) => logError("notify.channel", e));
  }
  const cur = await N.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await N.requestPermissionsAsync();
  return req.granted;
}

/* ─────────────────────────────────────────────────────────────────────────
   Remote push (P1, migration 032)

   Lokal eslatmalar (pastda) ilova ichida rejalashtiriladi va serverdagi
   holatni bilmaydi. Remote push esa cron'dan keladi — do'kon egasi ilovani
   ochmasa ham kunlik xulosani oladi.
   ───────────────────────────────────────────────────────────────────────── */

/** EAS loyiha ID — `app.json` dagi `extra.eas.projectId`. */
function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? null;
}

/**
 * Nega ro'yxatdan o'tmadi. Ilgari hammasi `false` qaytarardi va UI barchasini
 * "bu build'da mavjud emas" deb ko'rsatardi — FCM sozlanmagani yoki tarmoq
 * xatosi ham shunday chiqib, sababni topish imkonsiz edi.
 */
export type PushFailure =
  | "noModule" // native modul yo'q (Expo Go)
  | "noProjectId" // app.json extra.eas.projectId yo'q
  | "denied" // foydalanuvchi ruxsat bermadi
  | "noSession" // sessiya yo'q
  | "tokenFailed" // getExpoPushTokenAsync yiqildi (ko'pincha FCM sozlanmagan)
  | "saveFailed"; // DB'ga yozib bo'lmadi

export type PushResult = { ok: true } | { ok: false; reason: PushFailure; detail?: string };

/**
 * Qurilma push tokenini olib `push_tokens` jadvaliga yozadi (upsert).
 *
 * Login va do'kon almashtirilganda chaqiriladi. Xatolar jimgina jurnalga
 * tushadi — push ro'yxatdan o'tolmasa ham ilova normal ishlashi kerak.
 *
 * ⚠️ Faqat dev-build yoki production build'da ishlaydi (Expo Go emas) —
 * F3 kamerasi bilan bir xil cheklov.
 */
export async function registerPushToken(shopId: string | null): Promise<PushResult> {
  const N = await loadNotifications();
  if (!N) return { ok: false, reason: "noModule" };

  const projectId = easProjectId();
  if (!projectId) {
    logError("push.noProjectId", "app.json extra.eas.projectId topilmadi");
    return { ok: false, reason: "noProjectId" };
  }

  // Ruxsat allaqachon berilgan bo'lsagina davom etamiz — bu yerda dialog
  // ko'rsatmaymiz (login paytida kutilmagan so'rov chiqmasin). Ruxsat
  // Sozlamalardagi tugma orqali so'raladi.
  const perm = await N.getPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: "denied" };

  let token: string;
  try {
    const res = await N.getExpoPushTokenAsync({ projectId });
    token = res.data;
  } catch (e) {
    // Android'da eng ko'p uchraydigan sabab — EAS loyihasida FCM (Firebase)
    // sozlanmagan. Xato matnini saqlaymiz, aks holda sabab yo'qoladi.
    logError("push.tokenFailed", e);
    return {
      ok: false,
      reason: "tokenFailed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "noSession" };

  // To'g'ridan-to'g'ri `upsert` EMAS (migration 043): Expo tokeni qurilmaga
  // bog'liq va hisob almashtirilganda o'zgarmaydi. Eski qator boshqa
  // foydalanuvchi nomida bo'lsa ON CONFLICT → UPDATE yo'li RLS'ning USING
  // shartida yiqilardi ("violates row-level security policy (USING
  // expression)") va qurilma boshqa hech qachon ro'yxatdan o'tolmasdi.
  const { error } = await supabase.rpc("save_push_token", {
    p_token: token,
    p_shop_id: shopId,
    p_platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown",
  });
  if (error) {
    logError("push.saveFailed", error.message);
    return { ok: false, reason: "saveFailed", detail: error.message };
  }

  meta.setString(NotifKeys.pushToken, token);
  return { ok: true };
}

/**
 * Tokenni o'chiradi — logout'da chaqiriladi, aks holda telefonni boshqa
 * foydalanuvchiga bergan ega begona do'kon xulosasini olishda davom etardi.
 *
 * Muhlat bilan (8s): sekin tarmoqda logout tugmasi daqiqalab osilib
 * qolmasligi kerak — server javob bermasa ham lokal nusxa baribir
 * tozalanadi (`finally`), chaqiruvchi (koproq.tsx) buni kutib bo'lgach
 * `signOut()` ga o'tadi.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = meta.getString(NotifKeys.pushToken);
  if (!token) return;
  try {
    const { error } = await withTimeout(supabase.from("push_tokens").delete().eq("token", token), 8_000);
    if (error) throw new Error(error.message);
  } catch (e) {
    logError("push.unregister", e);
  } finally {
    // Server javobidan qat'i nazar lokal nusxani tozalaymiz.
    meta.remove(NotifKeys.pushToken);
  }
}

/**
 * Push uchun ruxsat so'raydi (dialog chiqadi) va tokenni yozadi.
 * Sozlamalardagi tugma shuni chaqiradi.
 */
export async function enablePush(shopId: string | null): Promise<PushResult> {
  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: "denied" };
  return registerPushToken(shopId);
}

/** Push hozir yoqilganmi (lokal belgi — server holati emas). */
export function isPushRegistered(): boolean {
  return Boolean(meta.getString(NotifKeys.pushToken));
}

/** Joriy tanlangan kunlik eslatma vaqti (MMKV). */
export function getDailySlot(): ReminderSlot {
  const v = meta.getString(NotifKeys.dailySlot);
  return v === "morning" || v === "evening" ? v : "off";
}

/**
 * Kunlik yakun eslatmasi: har kuni 09:00/21:00 da (qurilma vaqti) lokal
 * bildirishnoma. "off" → bekor qilinadi. true = muvaffaqiyatli saqlandi.
 */
export async function setDailySummaryReminder(slot: ReminderSlot): Promise<boolean> {
  const N = await loadNotifications();
  if (!N) return false;

  await N.cancelScheduledNotificationAsync(DAILY_ID).catch((e) => logError("notify.cancelDaily", e));
  if (slot === "off") {
    meta.setString(NotifKeys.dailySlot, slot);
    return true;
  }

  if (!(await ensureNotificationPermission())) return false;
  const { hour, minute } = SLOT_TIME[slot];
  await N.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: "Kunlik yakun",
      body: "Bugungi savdo natijalarini ko'rib chiqing.",
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  meta.setString(NotifKeys.dailySlot, slot);
  return true;
}

/**
 * Kam-qoldiq eslatmasi: ertaga (yoki bugun, hali kelmagan bo'lsa) 08:00 ga
 * bir martalik bildirishnoma — "buyurtma berish" eslatmasi. Kuniga bir marta;
 * ruxsat OLDIN berilgan bo'lsagina (dashboardda kutilmagan dialog chiqmasin).
 */
export async function maybeScheduleLowStockReminder(count: number): Promise<void> {
  if (count <= 0) return;
  const today = tashkentDateString();
  if (!shouldNotifyLowStock(meta.getString(NotifKeys.lowStockDate) ?? null, today)) return;

  const N = await loadNotifications();
  if (!N) return;
  const perm = await N.getPermissionsAsync();
  if (!perm.granted) return; // jim — ruxsatni faqat sozlamalarda so'raymiz

  await N.cancelScheduledNotificationAsync(LOW_STOCK_ID).catch((e) =>
    logError("notify.cancelLowStock", e),
  );
  await N.scheduleNotificationAsync({
    identifier: LOW_STOCK_ID,
    content: {
      title: "Kam qoldiq",
      body: `${count} ta mahsulot kam qoldi — buyurtma berishni unutmang.`,
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: nextOccurrence(8, 0),
    },
  });
  meta.setString(NotifKeys.lowStockDate, today);
}

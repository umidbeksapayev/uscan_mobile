import { Platform } from "react-native";

import { meta } from "@/lib/offline/mmkv";
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
  } catch {
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
    }).catch(() => {});
  }
  const cur = await N.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await N.requestPermissionsAsync();
  return req.granted;
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

  await N.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
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

  await N.cancelScheduledNotificationAsync(LOW_STOCK_ID).catch(() => {});
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

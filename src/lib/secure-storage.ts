import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Supabase sessiyasi (JWT + refresh token + user metadata) uchun xavfsiz
 * saqlash. Avval oddiy AsyncStorage ishlatilgan — bu ochiq matn, qurilma
 * root/jailbreak qilinsa yoki backup orqali osongina o'qiladi. POS ilovasi
 * bo'lgani uchun (sessiya orqali savdo/mijoz ma'lumotiga kirish huquqi
 * beriladi) endi iOS Keychain / Android Keystore orqali shifrlangan holda
 * saqlanadi.
 *
 * SecureStore har bir yozuvda ~2048 bayt chegarasiga ega (ayniqsa Android
 * Keystore'da) — Supabase sessiya JSON'i bundan osongina katta bo'ladi.
 * Shuning uchun qiymat bo'laklarga bo'linib saqlanadi va o'qishda qayta
 * yig'iladi.
 */
const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = "_chunks";

function chunkKey(key: string, index: number): string {
  return `${key}_${index}`;
}

async function getItemAsync(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  if (!countStr) return null;
  const count = Number(countStr);
  if (!Number.isFinite(count) || count <= 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part == null) return null; // uzilgan yozuv — buzuq deb hisoblanadi, qayta login so'raladi
    parts.push(part);
  }
  return parts.join("");
}

async function setItemAsync(key: string, value: string): Promise<void> {
  const prevCountStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  const prevCount = prevCountStr ? Number(prevCountStr) : 0;

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)),
  );
  await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, String(chunks.length));

  // Yangi qiymat avvalgisidan kamroq bo'lakka bo'lingan bo'lsa — ortiqcha
  // eski bo'laklarni tozalaymiz (aks holda keyingi o'qishda ular chalg'itadi).
  for (let i = chunks.length; i < prevCount; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
}

async function removeItemAsync(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  const count = countStr ? Number(countStr) : 0;
  await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))),
  );
  await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
}

// Web'da SecureStore mavjud emas (faqat `expo start --web` lokal ishlab
// chiqish uchun — productionda web target yo'q, ko'r. app.json).
export const secureStorage =
  Platform.OS === "web"
    ? AsyncStorage
    : { getItem: getItemAsync, setItem: setItemAsync, removeItem: removeItemAsync };

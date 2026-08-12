// Alohida fayl: "expo-notifications" import'ining O'ZI yiqilishini (native modul
// yo'q — Expo Go yoki eski dev build) simulyatsiya qiladi. Boshqa testlar bilan bir
// faylda bo'lsa, jest.mock moduli faqat bir marta baholanadi va boshqa holatlarni
// (granted/denied va h.k.) sinash imkonsiz bo'lardi.
jest.mock("expo-notifications", () => {
  throw new Error("native module not linked");
});

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: jest.fn() }, from: jest.fn() },
}));

jest.mock("@/lib/offline/mmkv", () => ({
  meta: { getString: jest.fn(), setString: jest.fn(), remove: jest.fn() },
}));

import { registerPushToken } from "../notify";

it("native modul yo'q bo'lsa noModule qaytaradi", async () => {
  const res = await registerPushToken(null);

  expect(res).toEqual({ ok: false, reason: "noModule" });
});

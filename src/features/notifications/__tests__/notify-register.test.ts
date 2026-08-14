import { supabase } from "@/lib/supabase";
import { meta } from "@/lib/offline/mmkv";
import { registerPushToken, enablePush } from "../notify";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    // Token yozish `save_push_token` RPC orqali (migration 043) — to'g'ridan-
    // to'g'ri upsert emas, ko'r. notify.ts dagi izoh.
    rpc: jest.fn(),
  },
}));

jest.mock("@/lib/offline/mmkv", () => ({
  meta: {
    getString: jest.fn(),
    setString: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: "test-project-id" } } },
  },
}));

const mockNotif = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { DEFAULT: 3 },
};

jest.mock("expo-notifications", () => mockNotif);

const Constants = jest.requireMock("expo-constants") as {
  default: { expoConfig: { extra: { eas: { projectId: string | null } } } };
};

beforeEach(() => {
  jest.clearAllMocks();
  Constants.default.expoConfig.extra.eas.projectId = "test-project-id";
  mockNotif.setNotificationChannelAsync.mockResolvedValue(undefined);
});

describe("registerPushToken", () => {
  it("projectId yo'q bo'lsa noProjectId qaytaradi", async () => {
    Constants.default.expoConfig.extra.eas.projectId = null;

    const res = await registerPushToken(null);

    expect(res).toEqual({ ok: false, reason: "noProjectId" });
  });

  it("ruxsat berilmagan bo'lsa denied qaytaradi (dialog ko'rsatmaydi)", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false });

    const res = await registerPushToken(null);

    expect(res).toEqual({ ok: false, reason: "denied" });
    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("getExpoPushTokenAsync yiqilsa tokenFailed + sabab matnini qaytaradi", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotif.getExpoPushTokenAsync.mockRejectedValue(new Error("FCM sozlanmagan"));

    const res = await registerPushToken(null);

    expect(res).toEqual({ ok: false, reason: "tokenFailed", detail: "FCM sozlanmagan" });
  });

  it("sessiya yo'q bo'lsa noSession qaytaradi", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotif.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    const res = await registerPushToken(null);

    expect(res).toEqual({ ok: false, reason: "noSession" });
  });

  it("DB yozuvi xato bersa saveFailed qaytaradi", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotif.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: "u1" } } });
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: "db down" } });

    const res = await registerPushToken("shop-1");

    expect(res).toEqual({ ok: false, reason: "saveFailed", detail: "db down" });
  });

  it("hammasi muvaffaqiyatli bo'lsa ok:true qaytaradi va tokenni MMKV'ga yozadi", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotif.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: "u1" } } });
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    const res = await registerPushToken("shop-1");

    expect(res).toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "save_push_token",
      expect.objectContaining({
        p_token: "ExponentPushToken[abc]",
        p_shop_id: "shop-1",
      }),
    );
    expect(meta.setString).toHaveBeenCalledWith("notifPushToken", "ExponentPushToken[abc]");
  });
});

describe("enablePush", () => {
  it("ruxsat so'raladi va rad etilsa registerPushToken chaqirilmaydi", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const res = await enablePush(null);

    expect(res).toEqual({ ok: false, reason: "denied" });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("ruxsat berilsa registerPushToken orqali ro'yxatdan o'tkazadi", async () => {
    // 1-chaqiruv (ensureNotificationPermission ichida) — hali so'ralmagan: false.
    // 2-chaqiruv (registerPushToken ichida) — foydalanuvchi berdi: true.
    mockNotif.getPermissionsAsync
      .mockResolvedValueOnce({ granted: false })
      .mockResolvedValue({ granted: true });
    mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotif.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: "u1" } } });
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    const res = await enablePush("shop-1");

    expect(res).toEqual({ ok: true });
  });
});

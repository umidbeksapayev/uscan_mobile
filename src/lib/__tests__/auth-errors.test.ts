import { authErrorMessage } from "../auth-errors";

describe("authErrorMessage", () => {
  it("noto'g'ri login ma'lumotlari", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Email yoki parol noto'g'ri.",
    );
  });

  it("allaqachon ro'yxatdan o'tgan", () => {
    expect(authErrorMessage("User already registered")).toBe(
      "Bu email allaqachon ro'yxatdan o'tgan.",
    );
  });

  it("tarmoq xatosi", () => {
    expect(authErrorMessage("Failed to fetch")).toBe(
      "Internet yo'q yoki Supabase sozlanmagan (.env).",
    );
  });

  it("muddati o'tgan/yaroqsiz havola (parolni tiklash)", () => {
    expect(authErrorMessage("Email link is invalid or has expired")).toBe(
      "Havola muddati o'tgan yoki noto'g'ri. Qaytadan so'rang.",
    );
    expect(authErrorMessage("Token has expired or is invalid")).toBe(
      "Havola muddati o'tgan yoki noto'g'ri. Qaytadan so'rang.",
    );
  });

  it("noma'lum xato → umumiy matn", () => {
    const generic = "Xatolik yuz berdi. Qayta urinib ko'ring.";
    expect(authErrorMessage("nimadir g'alati")).toBe(generic);
    expect(authErrorMessage(null)).toBe(generic);
    expect(authErrorMessage(undefined)).toBe(generic);
  });
});

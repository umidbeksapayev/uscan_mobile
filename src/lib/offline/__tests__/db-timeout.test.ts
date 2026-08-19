/**
 * Bu test `db.ts` ning HAQIQIY SQLite bilan ishlamaydi (native modul) —
 * shuning uchun faqat `withTimeout` naqshining o'zini, izolyatsiyada,
 * tasdiqlaydi: abadiy osilib qolgan promise KUTILGAN vaqtda rad etiladi.
 *
 * Bu qurilmada topilgan real xatoning ildizi edi: `decrementLocalQty`
 * (SQLite yozuvi) osilib qolsa, uni chaqiruvchi `checkout.ts`dagi
 * `.catch()` YORDAM BERMAYDI — `.catch()` faqat RAD ETILGAN promise'ni
 * tutadi, ABADIY OSILGANINI emas. Natijada `submitSale()` hech qachon
 * tugamaydi va to'lov tugmasi abadiy "yuklanmoqda" holatida qoladi.
 */
import { withTimeout } from "@/lib/with-timeout";

describe("SQLite hang → timeout naqshi (qurilmada topilgan xato)", () => {
  it("abadiy osilgan promise'ni .catch() USHLAMAYDI", async () => {
    const hung = new Promise(() => {
      /* hech qachon resolve/reject bo'lmaydi — o'lik SQLite handle */
    });
    let caught = false;
    // Real vaqt kutmasdan: agar .catch() yordam bersa edi, bu promise
    // qachondir tugagan bo'lardi. Yordam bermasligini shu bilan isbotlaymiz —
    // Promise.race orqali "hech qachon tugamadi" holatini aniqlaymiz.
    const result = await Promise.race([
      hung.catch(() => {
        caught = true;
      }),
      new Promise((resolve) => setTimeout(() => resolve("never-settled"), 20)),
    ]);
    expect(result).toBe("never-settled");
    expect(caught).toBe(false);
  });

  it("withTimeout ESA osilgan promise'ni belgilangan vaqtda rad etadi", async () => {
    const hung = new Promise(() => {});
    await expect(withTimeout(hung, 20, "sqlite timeout")).rejects.toThrow(
      "sqlite timeout",
    );
  });

  it("timeout'dan keyingi .catch() endi ISHLAYDI — checkout.ts shu bilan tuzaladi", async () => {
    const hung = new Promise(() => {});
    let caught: unknown = null;
    await withTimeout(hung, 20, "sqlite timeout").catch((e) => {
      caught = e;
    });
    expect((caught as Error).message).toBe("sqlite timeout");
  });
});

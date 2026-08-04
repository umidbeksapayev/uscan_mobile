import uzLatn from "../locales/uz-Latn.json";
import uzCyrl from "../locales/uz-Cyrl.json";
import ru from "../locales/ru.json";

/**
 * Uchala tarjima faylida kalitlar to'plami bir xil bo'lishi kerak.
 *
 * Amaliyotda kalit bitta faylga qo'shilib, qolgan ikkitasi unutilardi — natijada
 * foydalanuvchi rus tilida to'satdan o'zbekcha (fallback) matnni ko'rardi.
 * Bu test shu drift'ni PR bosqichida ushlaydi.
 */

type Json = Record<string, unknown>;

/** Ichma-ich obyektni "a.b.c" ko'rinishidagi yassi kalitlar ro'yxatiga aylantiradi. */
function flatten(obj: Json, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v as Json, key));
    } else {
      out.push(key);
    }
  }
  return out.sort();
}

const LOCALES = {
  "uz-Latn": flatten(uzLatn as Json),
  "uz-Cyrl": flatten(uzCyrl as Json),
  ru: flatten(ru as Json),
};

const BASE = "uz-Latn";

describe("i18n locale parity", () => {
  it("baza tilida kalitlar mavjud", () => {
    expect(LOCALES[BASE].length).toBeGreaterThan(500);
  });

  for (const lang of ["uz-Cyrl", "ru"] as const) {
    it(`${lang} — ${BASE} dagi barcha kalitlar mavjud`, () => {
      const missing = LOCALES[BASE].filter((k) => !LOCALES[lang].includes(k));
      expect(missing).toEqual([]);
    });

    it(`${lang} — ortiqcha kalit yo'q`, () => {
      const extra = LOCALES[lang].filter((k) => !LOCALES[BASE].includes(k));
      expect(extra).toEqual([]);
    });
  }

  /**
   * Ataylab bo'sh qoldirilgan kalitlar. Ba'zi iboralar bir necha kalitga
   * bo'lingan ("Do'koningizni" + "aqlli" + "boshqaring") — rus tilida so'z
   * tartibi boshqacha va butun ibora birinchi kalitga sig'adi, qolgani bo'sh.
   */
  const INTENTIONALLY_EMPTY = ["ru:landing.heroTitle2"];

  it("bo'sh qiymatli tarjima yo'q (ataylab bo'shlardan tashqari)", () => {
    const empties: string[] = [];
    for (const [lang, file] of Object.entries({ "uz-Latn": uzLatn, "uz-Cyrl": uzCyrl, ru })) {
      const walk = (obj: Json, prefix = "") => {
        for (const [k, v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === "object") walk(v as Json, key);
          else if (typeof v === "string" && !v.trim()) empties.push(`${lang}:${key}`);
        }
      };
      walk(file as Json);
    }
    expect(empties.filter((e) => !INTENTIONALLY_EMPTY.includes(e))).toEqual([]);
  });
});

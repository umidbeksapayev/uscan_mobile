import resolveConfig from "tailwindcss/resolveConfig";

import { radius, text, space } from "../tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tw = resolveConfig(require("../../../tailwind.config.js"));

/** Tailwind qiymati (`"1rem"` yoki `["1rem", {...}]`) → px. */
function px(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseFloat(String(raw)) * 16;
}

/**
 * Bu testning maqsadi — `tokens.ts` va `tailwind.config.js` ning AJRALIB
 * KETISHINI oldini olish. Ikkalasi bir xil o'lchamni bermasa, `className`
 * bilan yozilgan karta va inline `style` bilan yozilgan karta yonma-yon
 * turganda 2-4px farq qiladi — bu ilovaning "yig'ilmagan" ko'rinishining
 * asosiy sababi edi (14 xil radius, 13 xil shrift o'lchami).
 */
describe("o'lcham tokenlari Tailwind shkalasiga mos", () => {
  it("radius", () => {
    expect(radius.sm).toBe(px(tw.theme.borderRadius.lg)); // rounded-lg
    expect(radius.md).toBe(px(tw.theme.borderRadius.xl)); // rounded-xl
    expect(radius.lg).toBe(px(tw.theme.borderRadius["2xl"])); // rounded-2xl
    expect(radius.xl).toBe(px(tw.theme.borderRadius["3xl"])); // rounded-3xl
    expect(`${radius.full}px`).toBe(tw.theme.borderRadius.full);
  });

  it("shrift o'lchami", () => {
    expect(text.micro).toBe(px(tw.theme.fontSize["2xs"])); // loyihaga qo'shilgan
    expect(text.xs).toBe(px(tw.theme.fontSize.xs));
    expect(text.sm).toBe(px(tw.theme.fontSize.sm));
    expect(text.base).toBe(px(tw.theme.fontSize.base));
    expect(text.lg).toBe(px(tw.theme.fontSize.lg));
    expect(text.xl).toBe(px(tw.theme.fontSize.xl));
    expect(text.xl2).toBe(px(tw.theme.fontSize["2xl"]));
    expect(text.xl3).toBe(px(tw.theme.fontSize["3xl"]));
  });

  it("bo'sh joy", () => {
    expect(space.xs).toBe(px(tw.theme.spacing["1"]));
    expect(space.sm).toBe(px(tw.theme.spacing["2"]));
    expect(space.md).toBe(px(tw.theme.spacing["3"]));
    expect(space.lg).toBe(px(tw.theme.spacing["4"]));
    expect(space.xl).toBe(px(tw.theme.spacing["6"]));
    expect(space.xl2).toBe(px(tw.theme.spacing["8"]));
  });

  it("shkala qadamlari o'sib boradi (tasodifiy qiymat kirib qolmasin)", () => {
    const asc = (xs: number[]) => xs.every((v, i) => i === 0 || v > xs[i - 1]);
    expect(asc([radius.xs, radius.sm, radius.md, radius.lg, radius.xl])).toBe(true);
    expect(asc([text.micro, text.xs, text.sm, text.base, text.lg, text.xl, text.xl2, text.xl3])).toBe(true);
    expect(asc([space.xs, space.sm, space.md, space.lg, space.xl, space.xl2])).toBe(true);
  });
});

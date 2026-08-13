/**
 * O'lcham tokenlari — radius, shrift, bo'sh joy.
 *
 * `colors.ts` ranglar uchun nima qilsa, bu fayl O'LCHAMLAR uchun shuni qiladi:
 * `className` (`rounded-2xl`, `text-sm`) va inline `style` (`radius.lg`,
 * `text.sm`) **bir xil raqamni** berishi kerak.
 *
 * ⚠️ Qiymatlar Tailwind standart shkalasidan olingan va u bilan mos bo'lishi
 * SHART (`tailwind.config.js`). Ular o'ylab topilmagan: loyihada shrift
 * o'lchami 400 ta joyda `className` orqali, atigi 76 ta joyda inline
 * berilgan — ya'ni Tailwind shkalasi allaqachon amaldagi kanon edi, inline
 * qiymatlar esa (11, 13, 15, 17, 19) undan chetga chiqib ketgan.
 *
 * Yangi kod yozganda: `className` ishlatsa bo'ladigan joyda `className`
 * ishlating. Bu tokenlar faqat inline `style` majbur bo'lgan joylar uchun
 * (dinamik qiymat, `Ionicons` o'lchami, animatsiya).
 */

/* ── Radius ────────────────────────────────────────────────────────────
   Raqam emas, ROL bo'yicha tanlang: nishon (pill) har doim `full`,
   aylana ham `full` — "yarmi qancha" deb hisoblamang.
──────────────────────────────────────────────────────────────────────── */
export const radius = {
  /** Mikro bezak: ingichka chiziqcha, nuqta. */
  xs: 4,
  /** Kichik element. `rounded-lg` */
  sm: 8,
  /** Chip, kichik rasm (≤48px), kichik tugma. `rounded-xl` */
  md: 12,
  /** Karta, tugma, ro'yxat qatori. `rounded-2xl` — eng ko'p ishlatiladigan. */
  lg: 16,
  /** Hero karta, BottomSheet. `rounded-3xl` */
  xl: 24,
  /** Nishon (badge/pill) va aylana. `rounded-full` */
  full: 9999,
} as const;

/* ── Shrift o'lchami ───────────────────────────────────────────────────
   `micro` — Tailwind'da yo'q, loyihaga qo'shilgan (`text-2xs`): faqat
   nishon ichidagi raqam/yorliq uchun, oddiy matnda ishlatilmaydi.
──────────────────────────────────────────────────────────────────────── */
export const text = {
  /** Faqat nishon (badge) ichida. `text-2xs` */
  micro: 10,
  /** Yordamchi matn, izoh. `text-xs` */
  xs: 12,
  /** Ikkilamchi matn, ro'yxat tavsifi. `text-sm` */
  sm: 14,
  /** Asosiy matn. `text-base` */
  base: 16,
  /** Ta'kidlangan matn, kichik sarlavha. `text-lg` */
  lg: 18,
  /** Ekran sarlavhasi. `text-xl` */
  xl: 20,
  /** Katta ko'rsatkich. `text-2xl` */
  xl2: 24,
  /** Hero raqam (dashboard). `text-3xl` */
  xl3: 30,
} as const;

/* ── Bo'sh joy ─────────────────────────────────────────────────────────
   Tailwind bilan bir xil 4-lik shkala (`p-4` = 16). Oraliq qiymatlar
   (5, 6, 7, 10, 14) ATAYIN yo'q — ular ritmni buzadi.
──────────────────────────────────────────────────────────────────────── */
export const space = {
  /** 4 — `gap-1` */
  xs: 4,
  /** 8 — `gap-2` */
  sm: 8,
  /** 12 — `gap-3` */
  md: 12,
  /** 16 — `p-4`, ekran chekkasi */
  lg: 16,
  /** 24 — `p-6`, bo'limlar orasi */
  xl: 24,
  /** 32 — `p-8` */
  xl2: 32,
} as const;

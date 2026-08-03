/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Tungi rejim `dark` klassi bilan boshqariladi — NativeWind runtime uni
  // `colorScheme.set()` orqali qo'yadi (qarang: src/theme/theme-store.ts).
  darkMode: "class",
  theme: {
    extend: {
      // Ranglar CSS o'zgaruvchilariga bog'langan (qarang: src/global.css) —
      // shu tufayli `bg-surface`, `text-ink` kabi klasslar tungi rejimda
      // faylga tegmasdan avtomatik o'zgaradi.
      colors: {
        // Brend (uscan) — logo/dizayn palitrasi
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)", // urg'u (yorqin ko'k)
          deep: "rgb(var(--color-primary-deep) / <alpha-value>)", // asosiy (to'q ko'k)
          light: "rgb(var(--color-primary-light) / <alpha-value>)", // ochiq ko'k
          tint: "rgb(var(--color-primary-tint) / <alpha-value>)", // juda ochiq fon
        },
        // Ekran sarlavhalari (tungi rejimda yorishadi — `colors.ts`ga qarang)
        heading: "rgb(var(--color-heading) / <alpha-value>)",
        // Funksional
        success: "rgb(var(--color-success) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        kirim: "rgb(var(--color-kirim) / <alpha-value>)",
        "kirim-tint": "rgb(var(--color-kirim-tint) / <alpha-value>)",
        // Neytral
        bg: "rgb(var(--color-bg) / <alpha-value>)", // sahifa foni
        surface: "rgb(var(--color-surface) / <alpha-value>)", // kartalar
        ink: "rgb(var(--color-ink) / <alpha-value>)", // asosiy matn
        muted: "rgb(var(--color-muted) / <alpha-value>)", // yordamchi matn
        line: "rgb(var(--color-line) / <alpha-value>)", // chegara
        "tab-inactive": "rgb(var(--color-tab-inactive) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

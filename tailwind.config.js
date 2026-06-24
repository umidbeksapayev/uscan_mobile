/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brend (uscan) — logo/dizayn palitrasi
        primary: {
          DEFAULT: "#2F80ED", // urg'u (yorqin ko'k)
          deep: "#0F3D6E", // asosiy (to'q ko'k)
          light: "#7DB4F5", // ochiq ko'k
          tint: "#EAF2FE", // juda ochiq fon
        },
        // Funksional
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#F59E0B",
        // Neytral
        bg: "#F5F8FF", // sahifa foni
        surface: "#FFFFFF", // kartalar
        ink: "#0F172A", // asosiy matn
        muted: "#64748B", // yordamchi matn
        line: "#E6EAF0", // chegara
      },
    },
  },
  plugins: [],
};

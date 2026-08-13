// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "android/*",
      "ios/*",
      "graphify-out/*",
      "coverage/*",
      "scripts/reset-project.js",
    ],
  },
  {
    // `eslint-plugin-react` versiyani avtomatik aniqlashda ESLint 10 da
    // olib tashlangan `context.getFilename()` ni chaqiradi — versiyani
    // qo'lda ko'rsatsak, aniqlash kodi umuman ishga tushmaydi.
    settings: { react: { version: "19.1" } },
  },
  {
    // `@typescript-eslint` plagini eslint-config-expo'da faqat shu fayllar
    // uchun ulanadi — override ham shu doirada bo'lishi kerak.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Ishlatilmagan o'zgaruvchilar — `_` bilan boshlanadiganlari qasddan.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    rules: {
      // O'zbek lotin alifbosida `'` — harf (o', g', ta'minotchi), tipografik
      // xato emas. Qoida butun interfeys matnida shovqin qilardi.
      "react/no-unescaped-entities": "off",

      // Barcha BottomSheet'lar `@gorhom/bottom-sheet` modalida — yopilganda
      // bolalar UNMOUNT BO'LMAYDI. Shu sabab "ochilganda formani tozalash"
      // uchun `useEffect(() => { if (visible) setX(...) }, [visible])`
      // yagona ishlaydigan yo'l (`key` bilan remount qilib bo'lmaydi).
      // Qoida ogohlantirish sifatida qoladi — yangi kodda o'ylab ko'rish uchun.
      "react-hooks/set-state-in-effect": "warn",

      // NativeWind v4: `className` bo'lgan komponentda `style` funksiya
      // ko'rinishida berilsa, NativeWind uni o'zi hisoblagan uslublar bilan
      // ALMASHTIRADI — funksiya chaqirilmaydi, uslublar jimgina yo'qoladi
      // (Sprint 10, `SheetPressable` ildiz sababi).
      "no-restricted-syntax": [
        "error",
        {
          // O'lchamlar `theme/tokens.ts` dan olinadi. Ilgari kodda 14 xil
          // radius va 13 xil shrift o'lchami bor edi — har ekran o'z
          // raqamini o'zi tanlagani uchun ilova "yig'ilmagan" ko'rinardi.
          selector: 'Property[key.name=/^(fontSize|borderRadius)$/] > Literal',
          message:
            "Xom raqam o'rniga `@/theme/tokens` dan token oling (`text.sm`, `radius.lg`). Nishon va aylana uchun — `radius.full`.",
        },
        {
          selector:
            'JSXOpeningElement:has(JSXAttribute[name.name="className"]) > JSXAttribute[name.name="style"] > JSXExpressionContainer > ArrowFunctionExpression',
          message:
            "`className` bilan `style={({pressed}) => ...}` ni birga ishlatmang — NativeWind style funksiyasini chaqirmaydi va uslublar yo'qoladi. `style`ni massiv qiling, bosilish holatini `useState` orqali boshqaring.",
        },
      ],
    },
  },
  {
    // Testlar Jest muhitida ishlaydi.
    files: [
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "__mocks__/**/*.js",
      "jest.setup.js",
    ],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
]);

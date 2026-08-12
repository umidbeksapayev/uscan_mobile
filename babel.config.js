module.exports = function (api) {
  const isTest = api.env("test");
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Jest'ning CJS muhitida native `import()` ishlamaydi (Metro/Hermes'da ishlaydi,
    // lekin `--experimental-vm-modules`siz Jest'da yo'q) — faqat test'da `require`ga
    // aylantiramiz, ilova bundle'iga (Metro) ta'sir qilmaydi.
    plugins: isTest ? ["babel-plugin-dynamic-import-node"] : [],
  };
};

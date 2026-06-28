import { code128Binary } from "./code128";

/**
 * CODE128 qiymatidan skanerlanadigan SVG (matn). expo-print HTML'iga inline
 * qo'yiladi (canvas/DOM shart emas). Qora chiziqlar `<rect>` sifatida chiziladi;
 * ikki yon "quiet zone" (tinch zona) skanga shart.
 */
export interface BarcodeSvgOptions {
  /** Bir modul eni (px). Kengroq = telefon ishonchli o'qiydi. */
  moduleWidth?: number;
  /** Chiziq balandligi (px). */
  height?: number;
  /** Har yondagi tinch zona (modul). */
  quietModules?: number;
}

export function code128Svg(value: string, opts: BarcodeSvgOptions = {}): string {
  const m = opts.moduleWidth ?? 2;
  const h = opts.height ?? 56;
  const quiet = opts.quietModules ?? 10;

  const bin = code128Binary(value);
  const totalModules = bin.length + quiet * 2;
  const width = totalModules * m;

  let rects = "";
  let i = 0;
  while (i < bin.length) {
    if (bin[i] === "1") {
      let j = i + 1;
      while (j < bin.length && bin[j] === "1") j += 1;
      const x = (quiet + i) * m;
      const w = (j - i) * m;
      rects += `<rect x="${x}" y="0" width="${w}" height="${h}" fill="#000"/>`;
      i = j;
    } else {
      i += 1;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
}

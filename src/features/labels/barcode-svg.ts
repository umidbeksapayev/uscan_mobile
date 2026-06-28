import { code128Binary } from "./code128";

/**
 * CODE128 qiymatidan skanerlanadigan SVG (matn). expo-print HTML'iga inline
 * qo'yiladi (canvas/DOM shart emas). O'lcham mm'da BELGILANGAN — yorliq kengligiga
 * cho'zilmaydi (`max-width:100%` da bo'lgani kabi). Standart X-o'lcham 0.33mm
 * (retail EAN minimumi) → telefon ishonchli o'qiydi, lekin kompakt.
 */
export interface BarcodeSvgOptions {
  /** Bir modul (eng ingichka chiziq) eni — mm. */
  moduleMm?: number;
  /** Chiziq balandligi — mm. */
  heightMm?: number;
  /** Har yondagi tinch zona (modul). */
  quietModules?: number;
}

export function code128Svg(value: string, opts: BarcodeSvgOptions = {}): string {
  const xdim = opts.moduleMm ?? 0.33;
  const heightMm = opts.heightMm ?? 12;
  const quiet = opts.quietModules ?? 8;

  const bin = code128Binary(value);
  const totalModules = bin.length + quiet * 2;
  const widthMm = +(totalModules * xdim).toFixed(2);

  // viewBox modul birliklarida (X), balandlik 100 birlik (Y) — bars to'liq bo'yi.
  let rects = "";
  let i = 0;
  while (i < bin.length) {
    if (bin[i] === "1") {
      let j = i + 1;
      while (j < bin.length && bin[j] === "1") j += 1;
      rects += `<rect x="${quiet + i}" y="0" width="${j - i}" height="100" fill="#000"/>`;
      i = j;
    } else {
      i += 1;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${totalModules} 100" preserveAspectRatio="none" shape-rendering="crispEdges">${rects}</svg>`;
}

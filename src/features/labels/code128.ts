/**
 * Sof CODE128 enkoder (DOM/canvas YO'Q → RN'da va testda ishlaydi). Avto B/C:
 * raqamlarni Code C bilan JUFTLAB kodlaydi (2 raqam = 1 belgi) → barcode 2 barobar
 * QISQA bo'ladi (web jsbarcode "CODE128" kabi). Non-raqam yoki toq qoldiq Code B'da.
 * Skaner xuddi shu qiymatni o'qiydi → checkout lookup mos keladi.
 */

// CODE128 naqsh jadvali (index 0..106). Element kengliklari (bar,space,...); 11 modul,
// STOP (106) = 7 element, 13 modul.
// prettier-ignore
const PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
];

const CODE_C = 99;
const CODE_B = 100;
const START_B = 104;
const START_C = 105;
const STOP = 106;

function isDigit(value: string, pos: number): boolean {
  const c = value.charCodeAt(pos);
  return c >= 48 && c <= 57;
}

/** `pos` dan boshlab ketma-ket raqamlar soni. */
function digitRun(value: string, pos: number): number {
  let n = 0;
  while (pos + n < value.length && isDigit(value, pos + n)) n += 1;
  return n;
}

/** CODE128 kod qiymatlari (start + ma'lumot + switch'lar + nazorat + stop). */
function toCodes(value: string): number[] {
  const len = value.length;
  const codes: number[] = [];
  let i = 0;

  // Start kodi: yetarli yetakchi raqam bo'lsa Code C (zichroq)
  const lead = digitRun(value, 0);
  let modeC = lead >= 2 && (lead === len || lead >= 4);
  codes.push(modeC ? START_C : START_B);

  while (i < len) {
    if (modeC) {
      if (i + 1 < len && isDigit(value, i) && isDigit(value, i + 1)) {
        codes.push(Number(value.slice(i, i + 2))); // juft raqam → bitta belgi
        i += 2;
      } else {
        codes.push(CODE_B); // Code B'ga o'tamiz (toq qoldiq yoki non-raqam)
        modeC = false;
      }
    } else {
      const run = digitRun(value, i);
      const atEnd = i + run === len;
      if (run >= 4 || (atEnd && run >= 2 && run % 2 === 0)) {
        codes.push(CODE_C); // uzun raqam oqimi → Code C
        modeC = true;
      } else {
        const v = value.charCodeAt(i) - 32;
        if (v < 0 || v > 94) throw new Error(`CODE128-B noto'g'ri belgi: "${value[i]}"`);
        codes.push(v);
        i += 1;
      }
    }
  }

  // Nazorat raqami: start + sum(pos*qiymat), pos 1 dan
  let sum = codes[0];
  for (let k = 1; k < codes.length; k += 1) sum += codes[k] * k;
  codes.push(sum % 103);
  codes.push(STOP);
  return codes;
}

/** Element kengliklari satrini ("212222") "1"/"0" modul satriga (bar'dan boshlab). */
function widthsToBinary(widths: string): string {
  let out = "";
  let bar = true;
  for (const d of widths) {
    out += (bar ? "1" : "0").repeat(Number(d));
    bar = !bar;
  }
  return out;
}

/**
 * CODE128 "binary" modul satrini quradi (quiet zone'siz). Printable ASCII
 * (32–126) qabul qiladi; aks holda xato otadi.
 */
export function code128Binary(value: string): string {
  if (!value) throw new Error("CODE128: bo'sh qiymat");
  return toCodes(value)
    .map((c) => widthsToBinary(PATTERNS[c]))
    .join("");
}

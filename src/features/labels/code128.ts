/**
 * Sof CODE128-B enkoder (DOM/canvas YO'Q → RN'da va testda ishlaydi).
 * Yorliq barcode'ini SVG yoki boshqa renderga berish uchun "binary" modul
 * satrini ("1"=qora chiziq, "0"=oq) qaytaradi. CODE128-B barcha printable
 * ASCII (32–126) ni kodlaydi va skaner xuddi shu qiymatni o'qiydi → checkout
 * lookup mos keladi. (Web jsbarcode "CODE128" o'rnini bosadi.)
 */

// CODE128 naqsh jadvali (index 0..106). Har biri element kengliklari (bar,space,
// bar,space,bar,space) — yig'indisi 11 modul; STOP (106) = 7 element, 13 modul.
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

const START_B = 104;
const STOP = 106;

/** Element kengliklari satrini ("212222") "1"/"0" modul satriga aylantiradi (bar'dan boshlab). */
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
 * CODE128-B "binary" modul satrini quradi (quiet zone'siz). Faqat printable
 * ASCII (32–126) qabul qiladi; aks holda xato otadi.
 */
export function code128Binary(value: string): string {
  if (!value) throw new Error("CODE128: bo'sh qiymat");
  const codes: number[] = [START_B];
  let sum = START_B;
  let pos = 1;
  for (const ch of value) {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 94) throw new Error(`CODE128-B noto'g'ri belgi: "${ch}"`);
    codes.push(v);
    sum += v * pos;
    pos += 1;
  }
  codes.push(sum % 103); // nazorat raqami
  codes.push(STOP);
  return codes.map((c) => widthsToBinary(PATTERNS[c])).join("");
}

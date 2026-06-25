/**
 * ilike qidiruvida foydalanuvchi kiritgan LIKE wildcardlarini (`%` `_` `\`)
 * literal belgilarga aylantiradi. Aks holda "50%" yoki "a_b" kabi kiritmalar
 * pattern sifatida ishlab, noaniq natija beradi. (Xavfsizlik emas — ilike faqat
 * o'qiydi — lekin to'g'ri natija uchun.)
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

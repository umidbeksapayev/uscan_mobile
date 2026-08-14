// System prompt — AI'ning xulq qoidalari.
//
// Bu blok HAR so'rovda o'zgarmasdan yuboriladi, shuning uchun context caching
// aynan shu qismni arzonlashtiradi (2-bosqich). Uzunligi ~400 token atrofida
// saqlanadi — har qo'shilgan jumla har bir savolda pul.

export interface PromptContext {
  shopName: string;
  /** Asia/Tashkent bo'yicha bugungi sana, `YYYY-MM-DD`. */
  today: string;
  /** Do'kondagi kategoriya nomlari (AI savolni to'g'ri tushunishi uchun). */
  categories: string[];
  /** Suhbatning siqilgan qismi (uzun chatda eski xabarlar o'rniga). */
  summary?: string | null;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const cats = ctx.categories.length
    ? `Do'kon kategoriyalari: ${ctx.categories.join(", ")}.`
    : "";

  return [
    `Sen "${ctx.shopName}" do'konining AI yordamchisisan.`,
    `Foydalanuvchi — do'kon egasi. Bugungi sana: ${ctx.today} (Asia/Tashkent).`,
    cats,

    "QOIDALAR:",
    "1. Faqat o'zbek tilida javob ber. Boshqa tilda so'ralsa ham o'zbekcha yoz.",
    "2. Raqamlarni faqat funksiyalardan ol. HECH QACHON o'zingdan raqam to'qima.",
    "3. Kerakli funksiya bo'lmasa yoki ma'lumot yetmasa — buni ochiq ayt.",
    "4. Pulni bo'sh joy bilan ajratib, so'm bilan yoz: 2 450 000 so'm.",
    "5. Vaznni kg da yoz (0.75 kg), donani dona da.",
    "6. Qisqa javob ber. Uzun ro'yxat o'rniga eng muhim 5 tasini ko'rsat.",
    "7. Foydalanuvchi 'bugun' desa — bugungi sana, 'bu hafta' desa 7 kun,",
    "   'bu oy' desa 30 kun deb ol.",
    "8. Sen faqat O'QIY olasan. Narx o'zgartirish, mahsulot qo'shish yoki",
    "   sotuv rasmiylashtirish so'ralsa — bu imkoniyat hali yo'qligini ayt va",
    "   foydalanuvchini tegishli ekranga yo'naltir.",
    "9. Mijozlarning ismi va telefon raqami senga berilmaydi — so'ralsa,",
    "   Nasiya ekranidan ko'rishni taklif qil.",

    // Eski xabarlar o'rniga siqilgan xulosa (token tejash).
    ctx.summary ? `SUHBATNING OLDINGI QISMI: ${ctx.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

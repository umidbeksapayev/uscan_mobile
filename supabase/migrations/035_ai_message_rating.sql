-- 035: AI javobiga baho (👍 / 👎)
--
-- Nima uchun: AI javobining sifatini o'lchashning yagona ishonchli yo'li —
-- foydalanuvchi bahosi. To'plangan "yomon" javoblar keyinchalik system
-- prompt'ni yaxshilash uchun (few-shot misollar) ishlatiladi.
--
-- XAVFSIZLIK: `ai_messages` ga UPDATE huquqi FAQAT `rating` ustuniga beriladi
-- (ustun darajasidagi GRANT). Ya'ni klient javob matnini yoki token hisobini
-- o'zgartira olmaydi — RLS policy'si buni ta'minlay olmasdi, chunki RLS
-- qatorni himoya qiladi, ustunni emas.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–034. Orqaga mos.

BEGIN;

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating IN (-1, 1));

-- Faqat o'z chatidagi xabar (034 dagi SELECT policy bilan bir xil shart).
CREATE POLICY "ai_messages_update_own" ON ai_messages
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ai_chats c
    WHERE c.id = ai_messages.chat_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_chats c
    WHERE c.id = ai_messages.chat_id AND c.user_id = auth.uid()
  ));

GRANT UPDATE (rating) ON ai_messages TO authenticated;

COMMIT;

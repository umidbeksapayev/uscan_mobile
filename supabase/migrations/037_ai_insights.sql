-- 037: Kunlik AI xulosasi (proaktiv)
--
-- Bosh ekranda so'ralmasdan chiqadigan 2-3 gaplik xulosa: bugungi savdo,
-- haftalik o'zgarish, e'tibor talab qiladigan narsa.
--
-- Nega jadval kerak: xulosa kuniga BIR MARTA hisoblanadi. Ilova har
-- ochilganda qayta so'ralsa — kuniga o'nlab Gemini chaqiruvi bo'lardi
-- (ilova kun davomida ko'p marta ochiladi). Kalit `(shop_id, day)` —
-- shu do'kon uchun shu kunda bitta xulosa.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–036. Orqaga mos.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_insights (
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  -- Asia/Tashkent sanasi (server shu zonada hisoblaydi).
  day        DATE NOT NULL,
  text       TEXT NOT NULL,
  model      TEXT,
  tokens_in  INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, day)
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Faqat do'kon egasi — AI yordamchisining qolgan qismi bilan bir xil shart.
CREATE POLICY "ai_insights_select_owner" ON ai_insights
  FOR SELECT USING (is_shop_owner(shop_id));

CREATE POLICY "ai_insights_insert_owner" ON ai_insights
  FOR INSERT WITH CHECK (is_shop_owner(shop_id));

GRANT SELECT, INSERT ON ai_insights TO authenticated;

COMMIT;

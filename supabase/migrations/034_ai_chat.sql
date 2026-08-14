-- 034: AI yordamchi (Gemini) — chat, xabarlar, kvota
--
-- `docs/AI_ASSISTANT_PLAN_2026-08.md` 3-bo'limi.
-- Faqat DO'KON EGASI foydalanadi (`is_shop_owner`, migration 016).
-- Chat shaxsiy: bir xodim boshqasining chatini ko'rmaydi.
--
-- Kvota jadvali RLS orqali YOZILMAYDI — faqat SECURITY DEFINER funksiyalar
-- o'zgartiradi, aks holda client hisoblagichni nolga tushirib yuborardi.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–033. Orqaga mos.

BEGIN;

-- ---------------------------------------------------------------- chats ----

CREATE TABLE IF NOT EXISTS ai_chats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  title           TEXT,
  -- Uzun tarixni siqish: eski xabarlar xulosaga aylanadi (token tejash).
  summary         TEXT,
  summarized_upto TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chats_user
  ON ai_chats(user_id, updated_at DESC);

-- ------------------------------------------------------------- messages ----

CREATE TABLE IF NOT EXISTS ai_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id           UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'model', 'tool')),
  content           TEXT,
  -- Qaysi tool, qanday argument bilan chaqirilgani (audit + UI chipi uchun).
  tool_calls        JSONB,
  tokens_in         INT,
  tokens_out        INT,
  model             TEXT,
  latency_ms        INT,
  -- Idempotency: tarmoq uzilib qayta yuborilsa takror xabar yaratilmaydi
  -- (offline sotuvdagi `client_id` naqshi, migration 019).
  client_message_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_chat
  ON ai_messages(chat_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_messages_client
  ON ai_messages(chat_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- ---------------------------------------------------------------- usage ----

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  requests   INT NOT NULL DEFAULT 0,
  tokens_in  BIGINT NOT NULL DEFAULT 0,
  tokens_out BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, user_id, day)
);

-- ------------------------------------------------------------------ RLS ----

ALTER TABLE ai_chats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Chat: o'ziniki + faqat do'kon egasi.
CREATE POLICY "ai_chats_select_own" ON ai_chats
  FOR SELECT USING (user_id = auth.uid() AND is_shop_owner(shop_id));

CREATE POLICY "ai_chats_insert_own" ON ai_chats
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_shop_owner(shop_id));

CREATE POLICY "ai_chats_update_own" ON ai_chats
  FOR UPDATE USING (user_id = auth.uid() AND is_shop_owner(shop_id));

CREATE POLICY "ai_chats_delete_own" ON ai_chats
  FOR DELETE USING (user_id = auth.uid() AND is_shop_owner(shop_id));

-- Xabar: faqat o'z chatidagi qatorlar.
CREATE POLICY "ai_messages_select_own" ON ai_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM ai_chats c
    WHERE c.id = ai_messages.chat_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "ai_messages_insert_own" ON ai_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM ai_chats c
    WHERE c.id = ai_messages.chat_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "ai_messages_delete_own" ON ai_messages
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM ai_chats c
    WHERE c.id = ai_messages.chat_id AND c.user_id = auth.uid()
  ));

-- Kvota: faqat O'QISH. Yozish policy'si ataylab yo'q — pastdagi funksiyalar
-- SECURITY DEFINER bo'lgani uchun ular baribir yoza oladi.
CREATE POLICY "ai_usage_select_own" ON ai_usage_daily
  FOR SELECT USING (user_id = auth.uid());

-- ------------------------------------------------------------ funksiyalar --

-- Kunlik limitni tekshiradi va bittaga oshiradi.
-- Limitdan oshsa hisoblagich oshmaydi (allowed = false qaytadi).
CREATE OR REPLACE FUNCTION ai_consume_quota(
  p_shop_id UUID,
  p_limit   INT DEFAULT 100
)
RETURNS TABLE (allowed BOOLEAN, used INT, day_limit INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_used INT;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'forbidden: AI yordamchisi faqat do''kon egasi uchun';
  END IF;

  INSERT INTO ai_usage_daily (shop_id, user_id, day, requests)
  VALUES (p_shop_id, auth.uid(), CURRENT_DATE, 0)
  ON CONFLICT (shop_id, user_id, day) DO NOTHING;

  SELECT u.requests INTO v_used
  FROM ai_usage_daily u
  WHERE u.shop_id = p_shop_id AND u.user_id = auth.uid() AND u.day = CURRENT_DATE
  FOR UPDATE;

  IF v_used >= p_limit THEN
    RETURN QUERY SELECT FALSE, v_used, p_limit;
    RETURN;
  END IF;

  UPDATE ai_usage_daily u
  SET requests = u.requests + 1
  WHERE u.shop_id = p_shop_id AND u.user_id = auth.uid() AND u.day = CURRENT_DATE
  RETURNING u.requests INTO v_used;

  RETURN QUERY SELECT TRUE, v_used, p_limit;
END;
$$;

-- Javob kelgach real token sarfini yozadi (xarajat monitoringi uchun).
CREATE OR REPLACE FUNCTION ai_record_usage(
  p_shop_id    UUID,
  p_tokens_in  INT,
  p_tokens_out INT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE ai_usage_daily u
  SET tokens_in  = u.tokens_in  + GREATEST(COALESCE(p_tokens_in, 0), 0),
      tokens_out = u.tokens_out + GREATEST(COALESCE(p_tokens_out, 0), 0)
  WHERE u.shop_id = p_shop_id AND u.user_id = auth.uid() AND u.day = CURRENT_DATE;
END;
$$;

-- --------------------------------------------------------------- GRANTs ----
-- Yangi jadvallar Data API'ga avtomatik ochilmaydi — huquq aniq beriladi.

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chats      TO authenticated;
GRANT SELECT, INSERT, DELETE         ON ai_messages   TO authenticated;
GRANT SELECT                         ON ai_usage_daily TO authenticated;

GRANT EXECUTE ON FUNCTION ai_consume_quota(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_record_usage(UUID, INT, INT) TO authenticated;

COMMIT;

-- 036: AI taklif qilgan o'zgarishlar jurnali (propose → confirm)
--
-- AI hech narsani O'ZGARTIRMAYDI. U faqat taklif yozadi (`status = 'proposed'`),
-- foydalanuvchi ilovada tasdiqlagach esa O'ZGARISHNI ILOVA bajaradi (mavjud
-- `updateProduct` yo'li bilan) va shu qatorni `confirmed` ga o'tkazadi.
--
-- Nega shunday: model savolni noto'g'ri tushunsa ham (masalan "narxni 10%
-- tushir" ni butun katalogga qo'llasa) hech nima o'zgarmaydi — foydalanuvchi
-- ko'radi va rad etadi. Yozuv mantig'i bitta joyda qoladi, AI ikkinchi
-- "yashirin backend"ga aylanmaydi.
--
-- XAVFSIZLIK: UPDATE huquqi faqat `status` va `resolved_at` ustunlariga
-- beriladi — klient taklif tarkibini (qaysi mahsulot, qaysi qiymat)
-- keyinchalik o'zgartira olmaydi, ya'ni jurnal ishonchli qoladi.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–035. Orqaga mos.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      UUID REFERENCES ai_chats(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('update_price', 'update_stock')),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Nom nusxasi: mahsulot keyin o'chirilsa ham jurnal o'qilishi kerak.
  product_name TEXT NOT NULL,
  old_value    NUMERIC,
  new_value    NUMERIC,
  status       TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed', 'confirmed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_shop
  ON ai_actions(shop_id, created_at DESC);

ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;

-- Faqat o'z takliflari va faqat do'kon egasi (034 dagi shart bilan bir xil).
CREATE POLICY "ai_actions_select_own" ON ai_actions
  FOR SELECT USING (user_id = auth.uid() AND is_shop_owner(shop_id));

CREATE POLICY "ai_actions_insert_own" ON ai_actions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_shop_owner(shop_id));

CREATE POLICY "ai_actions_update_own" ON ai_actions
  FOR UPDATE
  USING (user_id = auth.uid() AND is_shop_owner(shop_id))
  WITH CHECK (user_id = auth.uid() AND is_shop_owner(shop_id));

GRANT SELECT, INSERT ON ai_actions TO authenticated;
-- Taklif tarkibi o'zgarmas: faqat holat va yechilgan vaqt yangilanadi.
GRANT UPDATE (status, resolved_at) ON ai_actions TO authenticated;

COMMIT;

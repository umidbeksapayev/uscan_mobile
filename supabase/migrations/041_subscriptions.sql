-- uscan mobile — Obuna/tarif tizimi poydevori
--
-- Model: obuna DO'KON darajasida (user emas) — barcha limitlar (mahsulot,
-- xodim, AI) `shop_id` bo'yicha, RLS ham shunday. `subscriptions.shop_id
-- UNIQUE` — bitta do'kon = bitta obuna. Ko'p do'kon (Ultra) = qo'shimcha
-- do'kon OCHISH huquqi, "tashkilot" tushunchasi ataylab kiritilmagan.
--
-- To'lov MVP'da QO'LDA (Telegram/qo'ng'iroq → admin `admin_set_plan()`
-- chaqiradi) — ilovada karta/to'lov integratsiyasi YO'Q, shuning uchun
-- `payments` jadvali ham yo'q (kerak bo'lganda alohida bosqichda).
--
-- Muddati tugaganda HECH NARSA o'chirilmaydi/read-only bo'lmaydi — kassa
-- ishlashda davom etadi, faqat YANGI mahsulot/xodim qo'shish to'siladi
-- (042_plan_limits_enforce.sql). Limit hisoblash real vaqtda
-- (`get_shop_limits`) — cron/eskirgan-holat saqlash shart emas.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–040 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) plans — tarif katalogi (narx/limit — reliz talab qilmaydi, shu yerdan
--    o'zgartiriladi). Matn emas — `name_key` i18n kaliti, matn klientda.
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
  code        TEXT PRIMARY KEY,
  name_key    TEXT NOT NULL,
  price_month INT  NOT NULL CHECK (price_month >= 0),
  price_year  INT  NOT NULL CHECK (price_year >= 0),
  -- {products, members, shops, ai_daily, history_days} — JSON null = cheksiz.
  limits      JSONB NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO plans (code, name_key, price_month, price_year, limits, sort_order) VALUES
  ('free',  'billing.plan.free',  0,      0,       '{"products":100,"members":0,"shops":1,"ai_daily":0,"history_days":30}'::jsonb, 0),
  ('pro',   'billing.plan.pro',   79000,  758000,  '{"products":1000,"members":3,"shops":1,"ai_daily":30,"history_days":null}'::jsonb, 1),
  ('ultra', 'billing.plan.ultra', 199000, 1910000, '{"products":null,"members":null,"shops":5,"ai_daily":200,"history_days":null}'::jsonb, 2)
ON CONFLICT (code) DO UPDATE SET
  name_key = EXCLUDED.name_key,
  price_month = EXCLUDED.price_month,
  price_year = EXCLUDED.price_year,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_select_all" ON plans;
CREATE POLICY "plans_select_all" ON plans FOR SELECT USING (true);
GRANT SELECT ON plans TO authenticated;

-- =====================================================
-- 2) subscriptions — bitta do'kon uchun bitta faol obuna yozuvi
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  plan_code           TEXT NOT NULL REFERENCES plans(code),
  status              TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'expired', 'canceled')),
  period              TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('month', 'year')),
  current_period_end  TIMESTAMPTZ,  -- NULL = muddatsiz (free yoki hali belgilanmagan)
  trial_ends_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (is_shop_member(shop_id));
-- Yozish policy'si YO'Q — faqat SECURITY DEFINER funksiyalar orqali
-- (admin_set_plan, shop-yaratish trigger). Mijoz to'g'ridan-to'g'ri
-- UPDATE/INSERT qila olmaydi — RLS avtomatik rad etadi.
GRANT SELECT ON subscriptions TO authenticated;

-- =====================================================
-- 3) subscription_events — audit tarixi (hech qachon UPDATE qilinmaydi)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id         BIGSERIAL PRIMARY KEY,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  from_plan  TEXT,
  to_plan    TEXT,
  status     TEXT,
  actor      UUID,           -- kim o'zgartirdi (odatda super_admin)
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_events_select" ON subscription_events;
CREATE POLICY "subscription_events_select" ON subscription_events
  FOR SELECT USING (is_shop_owner(shop_id) OR is_super_admin());
GRANT SELECT ON subscription_events TO authenticated;

-- =====================================================
-- 4) Har yangi do'konga avtomatik 14 kunlik Pro sinov
--    (web signup trigger va mobil complete_onboarding() — IKKALASI HAM
--    `shops`ga INSERT qiladi, shuning uchun bitta trigger yetarli — ikki
--    joyda kod yozish shart emas.)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_shop_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO subscriptions (shop_id, plan_code, status, period, trial_ends_at)
  VALUES (NEW.id, 'pro', 'trialing', 'month', now() + INTERVAL '14 days')
  ON CONFLICT (shop_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_shop_created_subscription ON shops;
CREATE TRIGGER on_shop_created_subscription
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_shop_subscription();

-- Backfill — bu migratsiyadan OLDIN yaratilgan do'konlar (trigger ularga
-- tegmagan). 90 kunlik Pro muhlati — mavjud foydalanuvchilar relizdan
-- keyin birdan Free limitiga urilib qolmasligi uchun.
INSERT INTO subscriptions (shop_id, plan_code, status, period, current_period_end)
SELECT id, 'pro', 'active', 'month', now() + INTERVAL '90 days'
FROM shops
WHERE id NOT IN (SELECT shop_id FROM subscriptions)
ON CONFLICT (shop_id) DO NOTHING;

-- =====================================================
-- 5) get_shop_limits() — effektiv limitlar (muddati o'tgan bo'lsa Free'ga
--    tushadi, HISOBLASH PAYTIDA — DB'da eskirgan holat saqlanmaydi).
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_shop_limits(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  -- Skalyar o'zgaruvchilarga SELECT INTO — RECORD turidan ataylab qochamiz:
  -- qator topilmasa RECORD "tayinlanmagan" holatda qoladi va keyingi
  -- maydon murojaati xato beradi, skalyarlar esa xavfsiz NULL bo'ladi.
  v_plan_code  TEXT;
  v_status     TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_expired    BOOLEAN := false;
  v_effective  TEXT;
  v_limits     JSONB;
BEGIN
  IF NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  SELECT plan_code, status, trial_ends_at, current_period_end
  INTO v_plan_code, v_status, v_trial_ends, v_period_end
  FROM subscriptions
  WHERE shop_id = p_shop_id;

  IF NOT FOUND THEN
    -- Nazariy holat (trigger har doim yaratadi) — himoya sifatida Free.
    v_plan_code := 'free';
    v_status := 'active';
  ELSIF v_status = 'trialing' AND v_trial_ends IS NOT NULL AND v_trial_ends < now() THEN
    v_expired := true;
  ELSIF v_status = 'active' AND v_period_end IS NOT NULL AND v_period_end < now() THEN
    v_expired := true;
  ELSIF v_status IN ('expired', 'canceled') THEN
    v_expired := true;
  END IF;

  v_effective := CASE WHEN v_expired THEN 'free' ELSE v_plan_code END;

  SELECT limits INTO v_limits FROM plans WHERE code = v_effective;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,              -- xarid qilingan reja (Free'ga tushgan bo'lsa ham asl kod)
    'effective_plan_code', v_effective,    -- limit hisoblash uchun ishlatiladigan kod
    'status', COALESCE(v_status, 'active'),
    'expired', v_expired,
    'trial_ends_at', v_trial_ends,
    'current_period_end', v_period_end,
    'limits', COALESCE(v_limits, (SELECT limits FROM plans WHERE code = 'free'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_limits(UUID) TO authenticated;

-- =====================================================
-- 6) admin_set_plan() — faqat super_admin. Web /admin panelidan
--    to'lov qo'lda tasdiqlangach chaqiriladi (MVP: karta/webhook yo'q).
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_set_plan(
  p_shop_id UUID,
  p_plan_code TEXT,
  p_period TEXT DEFAULT 'month',
  p_months INT DEFAULT 1,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_plan TEXT;
  v_new_status TEXT;
  v_period_end TIMESTAMPTZ;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM plans WHERE code = p_plan_code) THEN
    RAISE EXCEPTION 'unknown_plan';
  END IF;
  IF p_period NOT IN ('month', 'year') THEN
    RAISE EXCEPTION 'invalid_period';
  END IF;

  SELECT plan_code INTO v_old_plan FROM subscriptions WHERE shop_id = p_shop_id;

  IF p_plan_code = 'free' THEN
    v_new_status := 'active';
    v_period_end := NULL;
  ELSE
    v_new_status := 'active';
    v_period_end := now() + (GREATEST(p_months, 1) || ' months')::INTERVAL;
  END IF;

  INSERT INTO subscriptions (shop_id, plan_code, status, period, current_period_end, trial_ends_at, updated_at)
  VALUES (p_shop_id, p_plan_code, v_new_status, p_period, v_period_end, NULL, now())
  ON CONFLICT (shop_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = EXCLUDED.status,
    period = EXCLUDED.period,
    current_period_end = EXCLUDED.current_period_end,
    trial_ends_at = NULL,
    updated_at = now();

  INSERT INTO subscription_events (shop_id, from_plan, to_plan, status, actor, note)
  VALUES (p_shop_id, v_old_plan, p_plan_code, v_new_status, auth.uid(), p_note);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_plan(UUID, TEXT, TEXT, INT, TEXT) TO authenticated;

COMMIT;

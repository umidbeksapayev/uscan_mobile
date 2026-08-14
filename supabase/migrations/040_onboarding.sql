-- uscan mobile — Onboarding: do'kon nomini ro'yxatdan o'tishdan ajratish
--
-- Muammo: `handle_new_user()` (016_shop_members_rbac.sql, ShopScan_1v) HAR
-- BIR yangi `auth.users` yozuvi uchun so'zsiz do'kon yaratardi. Bu ikki narsa
-- bilan to'qnashadi:
--  1) Mobil onboarding — do'kon nomi ENDI signup paytida emas, alohida
--     qadamda (welcome → shop → done) kiritiladi.
--  2) Google orqali kirish — `shop_name` metadata umuman kelmaydi.
--  3) Xodim sifatida qo'shiladigan foydalanuvchi — o'zi ro'yxatdan o'tganda
--     unga hech qanday do'kon KERAK EMAS (egasi keyin `add_shop_member` bilan
--     boshqa do'konga qo'shadi); eski trigger baribir bittasini yaratib,
--     "soxta" do'kon qoldirardi.
--
-- Yechim: trigger SHARTLI qilinadi — `shop_name` kelgandagina (eski web
-- register yo'li, o'zgarmaydi) do'kon yaratiladi. Aks holda hech narsa
-- qilinmaydi — do'konni keyinroq `complete_onboarding()` (quyida) yaratadi.
-- Orqaga mos: web ilova BIR QATOR HAM o'zgarmaydi.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–039 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) shops / profiles — yangi ustunlar
-- =====================================================
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_language TEXT NOT NULL DEFAULT 'uz-Latn'
    CHECK (receipt_language IN ('uz-Latn', 'uz-Cyrl', 'ru'));

-- Mavjud do'konlar allaqachon "onboarded" — aks holda ular ham onboarding
-- ekraniga tushib qolardi (mavjud foydalanuvchiga ko'rinmasligi shart).
UPDATE shops SET onboarded_at = created_at WHERE onboarded_at IS NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language TEXT
    CHECK (language IS NULL OR language IN ('uz-Latn', 'uz-Cyrl', 'ru'));

-- =====================================================
-- 2) handle_new_user() — shartli do'kon yaratish
--    (016_shop_members_rbac.sql dagi versiyani almashtiradi)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop_id UUID;
  v_shop_name TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), '');
BEGIN
  -- shop_name kelmagan bo'lsa (mobil onboarding / Google / xodim) — do'kon
  -- YARATILMAYDI. Keyinroq complete_onboarding() yaratadi.
  IF v_shop_name IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.shops (owner_id, name, onboarded_at)
  VALUES (NEW.id, v_shop_name, now())
  RETURNING id INTO v_shop_id;

  INSERT INTO public.shop_members (shop_id, user_id, role)
  VALUES (v_shop_id, NEW.id, 'owner')
  ON CONFLICT (shop_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
-- Trigger o'zi (on_auth_user_created) allaqachon mavjud — funksiya tanasi
-- almashgani kifoya, qayta CREATE TRIGGER shart emas.

-- =====================================================
-- 3) complete_onboarding() — mobil onboarding do'kon yaratadi
--    Atomar: shops + shop_members(owner) + onboarded_at bitta tranzaksiyada
--    (funksiya ichida — chaqiruvchi tomonda qo'shimcha COMMIT shart emas).
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_shop_name TEXT,
  p_language TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop_id UUID;
  v_name TEXT := NULLIF(TRIM(p_shop_name), '');
  v_already_owner BOOLEAN;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'shop_name_required';
  END IF;
  IF p_language IS NOT NULL AND p_language NOT IN ('uz-Latn', 'uz-Cyrl', 'ru') THEN
    RAISE EXCEPTION 'invalid_language';
  END IF;

  -- Bu funksiya faqat ONBOARDING uchun — user allaqachon biror do'konning
  -- egasi bo'lsa (masalan tarmoq uzilib ikki marta bosilgan, yoki eski web
  -- yo'li orqali allaqachon do'kon olgan), qayta chaqirilmasligi kerak.
  -- (Kelajakda Ultra tarifda qo'shimcha do'kon ochish — alohida funksiya,
  -- bu yerga tegishli emas.)
  SELECT EXISTS (
    SELECT 1 FROM shop_members WHERE user_id = auth.uid() AND role = 'owner'
  ) INTO v_already_owner;

  IF v_already_owner THEN
    RAISE EXCEPTION 'already_onboarded';
  END IF;

  INSERT INTO shops (owner_id, name, onboarded_at, receipt_language)
  VALUES (auth.uid(), v_name, now(), COALESCE(p_language, 'uz-Latn'))
  RETURNING id INTO v_shop_id;

  INSERT INTO shop_members (shop_id, user_id, role)
  VALUES (v_shop_id, auth.uid(), 'owner');

  IF p_language IS NOT NULL THEN
    UPDATE profiles SET language = p_language WHERE id = auth.uid();
  END IF;

  RETURN v_shop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT) TO authenticated;

COMMIT;

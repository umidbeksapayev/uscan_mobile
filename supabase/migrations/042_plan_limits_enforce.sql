-- uscan mobile — Tarif limitlarini DB darajasida majburlash
--
-- 041_subscriptions.sql faqat MA'LUMOT modelini qo'ydi — hech narsani
-- to'smasdi. Bu migratsiya haqiqiy chegarani qo'yadi, lekin faqat O'SISH
-- amallariga: yangi mahsulot, yangi xodim. Sotuv/chek/nasiya/offline —
-- HECH QAYSI biriga tegilmaydi (kassa hech qachon to'silmaydi).
--
-- Bitta nuqta = bitta DB trigger/funksiya → REST insert, RPC (import_products),
-- offline sinxronizatsiya — hammasi bir xil qoidaga bo'ysunadi. Faqat
-- mijozda (`product-form.tsx`) tekshirish yetarli emas edi — bir necha
-- qatorlik so'rov bilan chetlab o'tish mumkin bo'lardi.
--
-- Xato shartnomasi: DB `plan_limit_<kalit>:<limit>` shaklida RAISE qiladi —
-- mijoz `features/billing/parse-plan-error.ts` bilan ajratib, `UpgradeSheet`
-- ochadi (`lib/auth-errors.ts` naqshiga mos: texnik xato → UI kodi).
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–041 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) products — yangi mahsulot qo'shishni to'sadi (mavjudlarga tegmaydi).
--    Faqat is_active=true qatorlar sanaladi — arxivlash o'rin bo'shatadi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit_text TEXT;
  v_limit INT;
  v_count INT;
BEGIN
  IF NOT NEW.is_active THEN
    RETURN NEW;  -- arxivlangan holatda qo'shish (odatiy yo'l emas) — sanoqqa kirmaydi
  END IF;

  v_limit_text := get_shop_limits(NEW.shop_id) -> 'limits' ->> 'products';
  IF v_limit_text IS NULL THEN
    RETURN NEW;  -- JSON null = cheksiz (Ultra)
  END IF;
  v_limit := v_limit_text::INT;

  SELECT COUNT(*) INTO v_count FROM products WHERE shop_id = NEW.shop_id AND is_active = true;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_products:%', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_plan_limit ON products;
CREATE TRIGGER trg_products_plan_limit
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_plan_limit();

-- =====================================================
-- 2) add_shop_member() — xodim limiti (016_shop_members_rbac.sql dagi
--    versiyani almashtiradi). Ega hisobga OLINMAYDI — limits.members
--    "egadan tashqari xodim" degani. Mavjud a'zoni qayta qo'shish/rolini
--    o'zgartirish (ON CONFLICT DO UPDATE) limitga tegmaydi — faqat YANGI
--    a'zolik sanaladi.
-- =====================================================
CREATE OR REPLACE FUNCTION add_shop_member(p_shop_id UUID, p_email TEXT, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_already_member BOOLEAN;
  v_limit_text TEXT;
  v_limit INT;
  v_count INT;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF p_role NOT IN ('owner', 'cashier') THEN
    RAISE EXCEPTION 'Noto''g''ri rol';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bu email bilan foydalanuvchi topilmadi. Avval ro''yxatdan o''tsin.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM shop_members WHERE shop_id = p_shop_id AND user_id = v_user_id
  ) INTO v_already_member;

  IF NOT v_already_member THEN
    v_limit_text := get_shop_limits(p_shop_id) -> 'limits' ->> 'members';
    IF v_limit_text IS NOT NULL THEN
      v_limit := v_limit_text::INT;
      SELECT COUNT(*) INTO v_count FROM shop_members WHERE shop_id = p_shop_id AND role = 'cashier';
      IF v_count >= v_limit THEN
        RAISE EXCEPTION 'plan_limit_members:%', v_limit;
      END IF;
    END IF;
  END IF;

  INSERT INTO shop_members (shop_id, user_id, role)
  VALUES (p_shop_id, v_user_id, p_role)
  ON CONFLICT (shop_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN jsonb_build_object('user_id', v_user_id);
END;
$$;

-- =====================================================
-- 3) ai_consume_quota() — 034_ai_chat.sql dagi versiyani almashtiradi.
--    `p_limit` parametri ENDI E'TIBORGA OLINMAYDI (imzo orqaga moslik
--    uchun saqlanadi, Edge Function o'zgarishsiz ishlayveradi) — haqiqiy
--    kunlik limit endi tarifdan (`get_shop_limits().limits.ai_daily`)
--    olinadi, mijoz uzatgan qiymatdan emas. Bu — 6-muammoning yechimi:
--    ilgari mijoz katta `p_limit` uzatib kvotani chetlab o'tishi mumkin edi.
-- =====================================================
CREATE OR REPLACE FUNCTION ai_consume_quota(
  p_shop_id UUID,
  p_limit   INT DEFAULT 100
)
RETURNS TABLE (allowed BOOLEAN, used INT, day_limit INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit_text TEXT;
  v_limit INT;
  v_used INT;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'forbidden: AI yordamchisi faqat do''kon egasi uchun';
  END IF;

  v_limit_text := get_shop_limits(p_shop_id) -> 'limits' ->> 'ai_daily';
  v_limit := CASE WHEN v_limit_text IS NULL THEN NULL ELSE v_limit_text::INT END;

  INSERT INTO ai_usage_daily (shop_id, user_id, day, requests)
  VALUES (p_shop_id, auth.uid(), CURRENT_DATE, 0)
  ON CONFLICT (shop_id, user_id, day) DO NOTHING;

  SELECT u.requests INTO v_used
  FROM ai_usage_daily u
  WHERE u.shop_id = p_shop_id AND u.user_id = auth.uid() AND u.day = CURRENT_DATE
  FOR UPDATE;

  -- v_limit IS NULL → cheksiz (hozircha hech bir tarifda yo'q, kelajakka zaxira).
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_used, v_limit;
    RETURN;
  END IF;

  UPDATE ai_usage_daily u
  SET requests = u.requests + 1
  WHERE u.shop_id = p_shop_id AND u.user_id = auth.uid() AND u.day = CURRENT_DATE
  RETURNING u.requests INTO v_used;

  RETURN QUERY SELECT TRUE, v_used, v_limit;
END;
$$;

-- =====================================================
-- Ataylab QILINMAGAN: do'kon (shops) limiti.
-- `plans.limits.members`/`ai_daily`/`products` — barchasi allaqachon
-- mavjud amal ustiga (xodim qo'shish, AI so'rovi, mahsulot qo'shish)
-- qo'yiladi. `shops` limiti esa "qo'shimcha do'kon OCHISH" degani — bu
-- ilova hozircha bunday amalni umuman taqdim etmaydi (onboarding faqat
-- BIRINCHI do'konni yaratadi, `complete_onboarding()` allaqachon
-- `already_onboarded` bilan ikkinchi chaqiruvni to'sadi). Cheklovni shu
-- yerda "majburlash" — chaqirilmaydigan kodni yozish bo'lardi. Ultra
-- tarifda ko'p-do'kon UI qo'shilganda, limit shu funksiyaga (yangi
-- `create_additional_shop()` yoki shunga o'xshash) qo'shiladi —
-- `plans.limits.shops` uchun DB qatori allaqachon tayyor.
COMMIT;

-- uscan mobile — To'lov va chek tekshiruvi (payments)
--
-- 041_subscriptions.sql ataylab `payments` jadvalisiz chiqqan edi: to'lov
-- QO'LDA (Telegram/qo'ng'iroq → admin `admin_set_plan()`) deb kelishilgan.
-- Endi bu qaror kengaytirilmoqda: to'lov jarayoni ILOVA ICHIDA bo'ladi —
-- foydalanuvchi tarif tanlaydi, kartaga o'tkazadi, chekni yuklaydi, admin
-- tekshirib tasdiqlaydi, obuna avtomatik faollashadi.
--
-- ⚠️ App Store / Play siyosati: raqamli obunani ilova ichida tashqi usul
-- bilan sotish rad etilish sababi bo'lishi mumkin (041 shu sababdan qochgan
-- edi). Qaror ongli ravishda o'zgartirildi — CLAUDE.md ga qarang.
--
-- Xavfsizlik tamoyillari (mavjud naqshga to'liq mos):
--  · `payments`da YOZISH SIYOSATI YO'Q — faqat quyidagi SECURITY DEFINER
--    funksiyalar orqali (`subscriptions` bilan bir xil naqsh).
--  · Summa SERVERDA `plans` jadvalidan hisoblanadi — mijoz uzatgan qiymat
--    umuman qabul qilinmaydi (042 dagi `ai_consume_quota.p_limit` darsi).
--  · Cheklar PRIVATE bucket'da (`product-images` PUBLIC — cheklarga yaramaydi),
--    faqat imzolangan (signed) URL bilan o'qiladi.
--
-- Kelajak: `provider` ustuni Payme/Click/Uzum uchun joy qoldiradi — manual
-- to'lov mantiqi obuna arxitekturasiga qattiq bog'lanmagan.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–044 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) payments — har bir to'lov urinishi alohida yozuv
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_code        TEXT NOT NULL REFERENCES plans(code),
  period           TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('month', 'year')),
  -- Necha oyga to'lov (yillikda 12) — obuna muddatini hisoblashda ishlatiladi.
  months           INT  NOT NULL CHECK (months >= 1),
  -- So'm. SERVER hisoblaydi (`plans.price_month`/`price_year`) — mijozdan olinmaydi.
  amount           INT  NOT NULL CHECK (amount >= 0),
  currency         TEXT NOT NULL DEFAULT 'UZS',
  -- Kelajakdagi gateway'lar uchun abstraksiya nuqtasi.
  provider         TEXT NOT NULL DEFAULT 'manual_card'
                     CHECK (provider IN ('manual_card', 'payme', 'click', 'uzum', 'telegram')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'expired')),
  -- Storage YO'LI (public URL EMAS) — o'qishda signed URL yasaladi.
  receipt_path     TEXT,
  -- Chek qaysi kanal orqali keldi: ilovada yuklandi yoki Telegram orqali.
  receipt_channel  TEXT CHECK (receipt_channel IN ('upload', 'telegram')),
  -- Foydalanuvchi kiritgan tranzaksiya/reference raqami (ixtiyoriy).
  reference        TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at     TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  reviewer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Rad etish sababi: kod (i18n uchun) + ixtiyoriy erkin matn.
  rejection_code   TEXT CHECK (rejection_code IN
                     ('wrong_amount', 'unreadable', 'not_found', 'duplicate', 'other')),
  rejection_reason TEXT,
  -- Kelajakdagi gateway javobi (webhook payload) uchun.
  provider_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status) WHERE status IN ('pending', 'reviewing');

-- Duplicate himoyasi (talab #12): bitta do'konda bir vaqtda faqat BITTA
-- faol (pending yoki reviewing) to'lov bo'lishi mumkin. Foydalanuvchi
-- "Obuna bo'lish"ni qayta bossa yangi yozuv YARATILMAYDI — mavjudi qaytadi.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_active
  ON payments(shop_id) WHERE status IN ('pending', 'reviewing');

-- =====================================================
-- 2) RLS — o'qish: do'kon EGASI o'zinikini, super_admin hammasini.
--    Yozish siyosati ATAYLAB yo'q (subscriptions naqshi).
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (is_shop_owner(shop_id) OR is_super_admin());

GRANT SELECT ON payments TO authenticated;

-- =====================================================
-- 3) payment-receipts — PRIVATE bucket (product-images PUBLIC, farqi shu).
--    Yo'l: {shop_id}/{payment_id}/{uuid}.{ext} — birinchi papka shop_id,
--    Storage RLS aynan shuni tekshiradi (003_storage_bucket.sql naqshi).
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "payment_receipts_select" ON storage.objects;
CREATE POLICY "payment_receipts_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT s.id::text FROM shops s
        JOIN shop_members m ON m.shop_id = s.id
        WHERE m.user_id = auth.uid() AND m.role = 'owner'
      )
    )
  );

DROP POLICY IF EXISTS "payment_receipts_insert" ON storage.objects;
CREATE POLICY "payment_receipts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM shops s
      JOIN shop_members m ON m.shop_id = s.id
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

-- UPDATE/DELETE siyosati ATAYLAB yo'q: chek — audit dalili, yuklangandan
-- keyin o'zgartirilmasligi kerak. Foydalanuvchi "qayta yuklash" bosganda
-- yangi fayl yoziladi (eski yetim qoladi, zarari yo'q).

-- =====================================================
-- 4) apply_subscription_period() — obuna muddatini QO'SHADI (reset EMAS).
--
--    Talab #9: 15 kun qolgan + 30 kunlik to'lov = 45 kun. Mavjud
--    `admin_set_plan()` esa `now() + months` qiladi, ya'ni qolgan kunlarni
--    o'chiradi — bu haqiqiy nuqson edi. `admin_set_plan()` o'zi
--    O'ZGARISHSIZ qoladi (u "qo'lda o'rnatish/tuzatish" vositasi, web
--    /admin unga tayanadi) — bu yangi funksiya esa TO'LOV yo'li uchun.
--
--    Sinov (trialing) ham hisobga olinadi: sinovda 10 kun qolgan bo'lsa,
--    to'langan oy o'shaning ustiga qo'shiladi (ataylab saxiy — foydalanuvchi
--    "to'ladim, kunlarim yo'qoldi" deb shikoyat qilmasligi kerak).
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_subscription_period(
  p_shop_id   UUID,
  p_plan_code TEXT,
  p_period    TEXT,
  p_months    INT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_plan   TEXT;
  v_old_end    TIMESTAMPTZ;
  v_old_trial  TIMESTAMPTZ;
  v_old_status TEXT;
  v_base       TIMESTAMPTZ;
  v_new_end    TIMESTAMPTZ;
BEGIN
  SELECT plan_code, current_period_end, trial_ends_at, status
  INTO v_old_plan, v_old_end, v_old_trial, v_old_status
  FROM subscriptions WHERE shop_id = p_shop_id;

  -- Qolgan muddat (obuna yoki sinov) — qaysi biri kechroq bo'lsa o'sha.
  -- Muddati o'tgan holatlar `GREATEST(now(), ...)` bilan o'zi tushib qoladi.
  v_base := GREATEST(now(), COALESCE(v_old_end, now()), COALESCE(v_old_trial, now()));
  v_new_end := v_base + (GREATEST(p_months, 1) || ' months')::INTERVAL;

  INSERT INTO subscriptions (shop_id, plan_code, status, period, current_period_end, trial_ends_at, updated_at)
  VALUES (p_shop_id, p_plan_code, 'active', p_period, v_new_end, NULL, now())
  ON CONFLICT (shop_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = 'active',
    period = EXCLUDED.period,
    current_period_end = EXCLUDED.current_period_end,
    trial_ends_at = NULL,   -- to'langandan keyin sinov tushunchasi yo'qoladi
    updated_at = now();

  INSERT INTO subscription_events (shop_id, from_plan, to_plan, status, actor, note)
  VALUES (p_shop_id, v_old_plan, p_plan_code, 'active', auth.uid(),
          'payment approved: +' || GREATEST(p_months, 1) || ' oy');

  RETURN v_new_end;
END;
$$;
-- GRANT yo'q: faqat `admin_review_payment()` ichidan chaqiriladi (SECURITY
-- DEFINER zanjiri) — mijoz to'g'ridan-to'g'ri chaqira olmasligi kerak.

-- =====================================================
-- 5) create_payment() — to'lov niyatini yaratadi (yoki mavjudini qaytaradi).
--    Summa SERVERDA hisoblanadi. Duplicate himoyasi shu yerda.
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_payment(
  p_shop_id   UUID,
  p_plan_code TEXT,
  p_period    TEXT DEFAULT 'month'
)
RETURNS payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing payments;
  v_price    INT;
  v_months   INT;
  v_row      payments;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF p_period NOT IN ('month', 'year') THEN
    RAISE EXCEPTION 'invalid_period';
  END IF;

  -- Muddati o'tgan `pending` to'lovlarni avval yopamiz (cron yo'q — o'qish
  -- paytida hisoblash naqshi, `get_shop_limits` bilan bir xil falsafa).
  UPDATE payments SET status = 'expired'
  WHERE shop_id = p_shop_id AND status = 'pending' AND created_at < now() - INTERVAL '7 days';

  -- Duplicate himoyasi: faol to'lov bo'lsa YANGISI yaratilmaydi.
  SELECT * INTO v_existing FROM payments
  WHERE shop_id = p_shop_id AND status IN ('pending', 'reviewing')
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- Tarif/muddat o'zgargan bo'lsa va chek hali yuborilmagan bo'lsa —
    -- mavjud yozuvni yangilaymiz (foydalanuvchi fikridan qaytdi).
    IF v_existing.status = 'pending'
       AND (v_existing.plan_code <> p_plan_code OR v_existing.period <> p_period) THEN
      SELECT CASE WHEN p_period = 'year' THEN price_year ELSE price_month END
      INTO v_price FROM plans WHERE code = p_plan_code AND is_active = true;
      IF v_price IS NULL THEN
        RAISE EXCEPTION 'unknown_plan';
      END IF;
      IF v_price <= 0 THEN
        RAISE EXCEPTION 'plan_not_purchasable';
      END IF;

      UPDATE payments SET
        plan_code = p_plan_code,
        period = p_period,
        months = CASE WHEN p_period = 'year' THEN 12 ELSE 1 END,
        amount = v_price,
        created_at = now()
      WHERE id = v_existing.id
      RETURNING * INTO v_row;
      RETURN v_row;
    END IF;

    RETURN v_existing;
  END IF;

  SELECT CASE WHEN p_period = 'year' THEN price_year ELSE price_month END
  INTO v_price FROM plans WHERE code = p_plan_code AND is_active = true;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'unknown_plan';
  END IF;
  IF v_price <= 0 THEN
    -- Free tarif sotib olinmaydi (narxi 0) — mijoz UI'da ham ko'rsatmaydi,
    -- bu server tomonidagi ikkinchi qatlam.
    RAISE EXCEPTION 'plan_not_purchasable';
  END IF;

  v_months := CASE WHEN p_period = 'year' THEN 12 ELSE 1 END;

  INSERT INTO payments (shop_id, plan_code, period, months, amount, created_by)
  VALUES (p_shop_id, p_plan_code, p_period, v_months, v_price, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payment(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 6) submit_payment_receipt() — chek yuborildi → `reviewing`.
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_payment_id UUID,
  p_channel    TEXT,
  p_path       TEXT DEFAULT NULL,
  p_reference  TEXT DEFAULT NULL
)
RETURNS payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment payments;
  v_row     payments;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;
  IF NOT is_shop_owner(v_payment.shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF p_channel NOT IN ('upload', 'telegram') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  -- Talab #12: tasdiqlangan to'lovga qayta chek yuborib bo'lmaydi.
  IF v_payment.status = 'approved' THEN
    RAISE EXCEPTION 'payment_already_approved';
  END IF;
  IF v_payment.status NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'payment_not_active';
  END IF;
  IF p_channel = 'upload' AND NULLIF(TRIM(p_path), '') IS NULL THEN
    RAISE EXCEPTION 'receipt_required';
  END IF;
  -- Yo'l boshqa do'konning papkasiga ishora qilmasligi kerak (Storage RLS
  -- ham to'sadi, bu ikkinchi qatlam — yozuvda yolg'on yo'l qolmasin).
  IF p_path IS NOT NULL AND split_part(p_path, '/', 1) <> v_payment.shop_id::text THEN
    RAISE EXCEPTION 'invalid_receipt_path';
  END IF;

  UPDATE payments SET
    status = 'reviewing',
    receipt_path = COALESCE(NULLIF(TRIM(p_path), ''), receipt_path),
    receipt_channel = p_channel,
    reference = NULLIF(TRIM(p_reference), ''),
    submitted_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 7) cancel_payment() — foydalanuvchi o'z to'lovidan voz kechadi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment payments;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;
  IF NOT is_shop_owner(v_payment.shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF v_payment.status = 'approved' THEN
    RAISE EXCEPTION 'payment_already_approved';
  END IF;
  IF v_payment.status NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'payment_not_active';
  END IF;

  UPDATE payments SET status = 'expired', reviewed_at = now() WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_payment(UUID) TO authenticated;

-- =====================================================
-- 8) admin_review_payment() — super_admin tasdiqlaydi/rad etadi.
--    Tasdiqlanganda obuna SHU YERDA faollashadi (bitta tranzaksiya).
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_review_payment(
  p_payment_id      UUID,
  p_approve         BOOLEAN,
  p_rejection_code  TEXT DEFAULT NULL,
  p_rejection_text  TEXT DEFAULT NULL
)
RETURNS payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment payments;
  v_row     payments;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;
  IF v_payment.status = 'approved' THEN
    RAISE EXCEPTION 'payment_already_approved';
  END IF;

  IF NOT p_approve THEN
    IF p_rejection_code IS NOT NULL
       AND p_rejection_code NOT IN ('wrong_amount', 'unreadable', 'not_found', 'duplicate', 'other') THEN
      RAISE EXCEPTION 'invalid_rejection_code';
    END IF;

    UPDATE payments SET
      status = 'rejected',
      rejection_code = COALESCE(p_rejection_code, 'other'),
      rejection_reason = NULLIF(TRIM(p_rejection_text), ''),
      reviewed_at = now(),
      reviewer_id = auth.uid()
    WHERE id = p_payment_id
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- Tasdiqlash: obuna muddati QO'SHILADI (reset emas — 4-bo'limga qarang).
  PERFORM apply_subscription_period(
    v_payment.shop_id, v_payment.plan_code, v_payment.period, v_payment.months
  );

  UPDATE payments SET
    status = 'approved',
    reviewed_at = now(),
    reviewer_id = auth.uid(),
    rejection_code = NULL,
    rejection_reason = NULL
  WHERE id = p_payment_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_payment(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 9) admin_list_payments() — admin ekrani uchun (do'kon nomi + egasi bilan).
--    RLS `payments`ni allaqachon super_admin'ga ochadi, lekin bu funksiya
--    JOIN'larni (shops.name, egasining emaili) bir joyda beradi — mijozda
--    uchta alohida so'rov qilish shart emas.
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_list_payments(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id               UUID,
  shop_id          UUID,
  shop_name        TEXT,
  owner_email      TEXT,
  plan_code        TEXT,
  period           TEXT,
  months           INT,
  amount           INT,
  currency         TEXT,
  provider         TEXT,
  status           TEXT,
  receipt_path     TEXT,
  receipt_channel  TEXT,
  reference        TEXT,
  created_at       TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  rejection_code   TEXT,
  rejection_reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  RETURN QUERY
  SELECT p.id, p.shop_id, s.name, u.email::TEXT,
         p.plan_code, p.period, p.months, p.amount, p.currency, p.provider,
         p.status, p.receipt_path, p.receipt_channel, p.reference,
         p.created_at, p.submitted_at, p.reviewed_at,
         p.rejection_code, p.rejection_reason
  FROM payments p
  JOIN shops s ON s.id = p.shop_id
  LEFT JOIN auth.users u ON u.id = s.owner_id
  WHERE (p_status IS NULL OR p.status = p_status)
  ORDER BY
    -- Tekshirish kutayotganlar doim tepada (admin ishi shu yerda).
    CASE WHEN p.status = 'reviewing' THEN 0 ELSE 1 END,
    COALESCE(p.submitted_at, p.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_payments(TEXT) TO authenticated;

-- =====================================================
-- 10) my_active_payment() — do'konning joriy faol to'lovi (bor bo'lsa).
--     Checkout ekrani ochilganda "davom etayotgan to'lov bormi?" savoliga
--     bitta so'rov bilan javob beradi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.my_active_payment(p_shop_id UUID)
RETURNS payments
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_row payments;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  SELECT * INTO v_row FROM payments
  WHERE shop_id = p_shop_id AND status IN ('pending', 'reviewing')
  ORDER BY created_at DESC LIMIT 1;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_active_payment(UUID) TO authenticated;

COMMIT;

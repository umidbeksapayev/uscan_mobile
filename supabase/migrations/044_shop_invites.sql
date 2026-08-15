-- uscan mobile — Kassir taklifi (shop_invites)
--
-- Muammo: `add_shop_member` (016/042) darhol biriktiradi, lekin FAQAT email
-- allaqachon `auth.users`da bo'lsa ishlaydi — ega va kassir aniq tartibda
-- harakat qilishi kerak edi (avval kassir ro'yxatdan o'tsin, keyin ega
-- qo'shsin). Aks holda "bu email bilan foydalanuvchi topilmadi" xatosi.
-- Onboarding'dagi "Xodim sifatida qo'shilaman" yo'li ham shunga bog'liq edi:
-- `waiting.tsx` faqat qo'lda "Tekshirish" bilan `memberships`ni qayta so'rardi
-- — ega qo'shganini ko'rish uchun ko'r taxmin bilan bosish kerak edi.
--
-- Yechim: haqiqiy taklif jadvali. Tartib endi muhim emas — ega istalgan
-- vaqtda (kassir ro'yxatdan o'tishidan oldin ham) taklif yozadi, kassir
-- ro'yxatdan o'tgach/kirgach o'ziga kelgan takliflarni ko'radi va ANIQ
-- qabul qiladi (bir tomonlama "biriktirish" emas — rozilik talab qilinadi,
-- bu ham xavfsizroq: ega boshqa birovning akkauntini so'ramasdan ulay
-- olmaydi).
--
-- `add_shop_member`/`remove_shop_member` (042_plan_limits_enforce.sql)
-- o'zgarishsiz qoladi — web ilova va eski yo'l shu bilan ishlashda davom
-- etadi, faqat mobil `staff.tsx` endi shu yangi RPC'larga o'tadi.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–043 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) jadval
-- =====================================================
CREATE TABLE IF NOT EXISTS shop_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shop_invites_shop ON shop_invites(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invites_email_pending ON shop_invites(email) WHERE status = 'pending';

-- Bitta do'kon + email uchun bir vaqtda faqat BITTA faol (pending) taklif —
-- qayta taklif qilish shu indeks orqali "yangilash"ga aylanadi (pastda,
-- `invite_shop_member` ichidagi ON CONFLICT).
CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_invites_pending ON shop_invites(shop_id, email) WHERE status = 'pending';

-- =====================================================
-- 2) RLS — o'qish ikki tomonlama (ega o'z do'koni, taklif qilingan o'z
--    emailiga kelgan takliflarni), yozish esa FAQAT quyidagi SECURITY
--    DEFINER funksiyalar orqali (to'g'ridan-to'g'ri INSERT/UPDATE siyosati
--    ataylab yo'q — add_shop_member naqshiga mos).
--
--    `is_shop_owner()` naqshiga mos: siyosat ichida to'g'ridan-to'g'ri
--    `auth.users`ga murojaat QILINMAYDI (`authenticated` rolida u yerga
--    SELECT huquqi yo'q — RLS siyosati ichida bo'lsa "permission denied"
--    bilan butun so'rov yiqilardi). SECURITY DEFINER funksiya orqali —
--    egasi huquqi bilan ishlaydi, RLS'ni chetlab o'tadi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_my_invite_email(p_email TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT lower(p_email) = lower(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), ''));
$$;

ALTER TABLE shop_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_invites_owner_select" ON shop_invites;
CREATE POLICY "shop_invites_owner_select" ON shop_invites
  FOR SELECT USING (is_shop_owner(shop_id));

DROP POLICY IF EXISTS "shop_invites_invitee_select" ON shop_invites;
CREATE POLICY "shop_invites_invitee_select" ON shop_invites
  FOR SELECT USING (status = 'pending' AND is_my_invite_email(email));

-- =====================================================
-- 3) invite_shop_member() — ega tomonidan taklif yaratish/yangilash.
--    add_shop_member'dan farqi: `auth.users`da email topilmasa ham
--    XATO BERMAYDI — kassir hali ro'yxatdan o'tmagan bo'lishi mumkin.
--    Limit tekshiruvi BU YERDA emas (taklif hali a'zolik yaratmaydi) —
--    `respond_shop_invite()` qabul qilinganda tekshiradi (042 naqshiga mos:
--    haqiqiy resurs sarflanganda majburlash).
-- =====================================================
CREATE OR REPLACE FUNCTION public.invite_shop_member(
  p_shop_id UUID,
  p_email   TEXT,
  p_role    TEXT DEFAULT 'cashier'
)
RETURNS shop_invites
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_already_member BOOLEAN;
  v_row shop_invites;
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  IF p_role NOT IN ('owner', 'cashier') THEN
    RAISE EXCEPTION 'Noto''g''ri rol';
  END IF;
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM shop_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.shop_id = p_shop_id AND lower(u.email) = v_email
  ) INTO v_already_member;
  IF v_already_member THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  INSERT INTO shop_invites (shop_id, email, role, invited_by)
  VALUES (p_shop_id, v_email, p_role, auth.uid())
  ON CONFLICT (shop_id, email) WHERE status = 'pending'
    DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, created_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_shop_member(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 4) cancel_shop_invite() — ega hali javob berilmagan taklifni bekor qiladi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.cancel_shop_invite(p_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT shop_id INTO v_shop_id FROM shop_invites WHERE id = p_invite_id AND status = 'pending';
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF NOT is_shop_owner(v_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  UPDATE shop_invites SET status = 'cancelled', responded_at = now() WHERE id = p_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_shop_invite(UUID) TO authenticated;

-- =====================================================
-- 5) list_shop_invites() — ega uchun o'z do'konining kutilayotgan takliflari.
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_shop_invites(p_shop_id UUID)
RETURNS SETOF shop_invites
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  RETURN QUERY
  SELECT * FROM shop_invites
  WHERE shop_id = p_shop_id AND status = 'pending'
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_shop_invites(UUID) TO authenticated;

-- =====================================================
-- 6) list_my_invites() — joriy foydalanuvchining o'ziga kelgan takliflari
--    (email bo'yicha, `shop_members`ga bog'liq emas — hali a'zo emas).
--    Onboarding "kutish" ekrani shu yerdan o'qiydi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_my_invites()
RETURNS TABLE (
  id         UUID,
  shop_id    UUID,
  shop_name  TEXT,
  role       TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- `auth.users.id`ni ANIQ nomlash shart: `RETURNS TABLE (id UUID, ...)`
  -- funksiya tanasida `id` nomli o'z o'zgaruvchisini yaratadi — qo'shimcha
  -- alias bo'lmasa "column reference id is ambiguous" xatosi chiqadi.
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  IF v_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT i.id, i.shop_id, s.name, i.role, i.created_at
  FROM shop_invites i
  JOIN shops s ON s.id = i.shop_id
  WHERE i.status = 'pending' AND lower(i.email) = v_email
  ORDER BY i.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_invites() TO authenticated;

-- =====================================================
-- 7a) get_effective_plan_limits() — 041_subscriptions.sql dagi
--    `get_shop_limits()` mantig'i, FAQAT `is_shop_member()` tekshiruvisiz.
--
--    Sabab: `respond_shop_invite()` limitni ANIQ a'zo bo'lishdan OLDIN
--    tekshirishi kerak (a'zolik shu funksiya orqali endigina yaratiladi) —
--    `get_shop_limits()`ni to'g'ridan-to'g'ri chaqirsa, chaqiruvchi hali
--    a'zo emasligi sababli "Ruxsat yo'q" bilan yiqilardi. `get_shop_limits()`
--    o'zi bu funksiya ustidan yupqa qobiq bo'lib qoladi — boshqa hech bir
--    chaqiruvchi joyda (mijoz, `enforce_product_plan_limit`, `add_shop_member`)
--    xavfsizlik xatti-harakati o'zgarmaydi.
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_effective_plan_limits(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_plan_code  TEXT;
  v_status     TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_expired    BOOLEAN := false;
  v_effective  TEXT;
  v_limits     JSONB;
BEGIN
  SELECT plan_code, status, trial_ends_at, current_period_end
  INTO v_plan_code, v_status, v_trial_ends, v_period_end
  FROM subscriptions
  WHERE shop_id = p_shop_id;

  IF NOT FOUND THEN
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
    'plan_code', v_plan_code,
    'effective_plan_code', v_effective,
    'status', COALESCE(v_status, 'active'),
    'expired', v_expired,
    'trial_ends_at', v_trial_ends,
    'current_period_end', v_period_end,
    'limits', COALESCE(v_limits, (SELECT limits FROM plans WHERE code = 'free'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_plan_limits(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shop_limits(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  RETURN public.get_effective_plan_limits(p_shop_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_limits(UUID) TO authenticated;

-- =====================================================
-- 7) respond_shop_invite() — taklif qilingan foydalanuvchi qabul/rad etadi.
--    Qabulda: limit tekshiriladi (add_shop_member/042 bilan bir xil qoida),
--    `shop_members` yoziladi, taklif holati yangilanadi — hammasi bitta
--    tranzaksiyada (funksiya = atomik).
-- =====================================================
CREATE OR REPLACE FUNCTION public.respond_shop_invite(p_invite_id UUID, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
  v_invite shop_invites;
  v_limit_text TEXT;
  v_limit INT;
  v_count INT;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invite
  FROM shop_invites
  WHERE id = p_invite_id AND status = 'pending' AND lower(email) = v_email
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF NOT p_accept THEN
    UPDATE shop_invites SET status = 'declined', responded_at = now() WHERE id = p_invite_id;
    RETURN jsonb_build_object('accepted', false);
  END IF;

  -- Xuddi shu limit qoidasi (042_plan_limits_enforce.sql, add_shop_member) —
  -- faqat YANGI kassir a'zolik sanaladi (ega hisobga olinmaydi).
  IF v_invite.role = 'cashier' THEN
    v_limit_text := get_effective_plan_limits(v_invite.shop_id) -> 'limits' ->> 'members';
    IF v_limit_text IS NOT NULL THEN
      v_limit := v_limit_text::INT;
      SELECT COUNT(*) INTO v_count FROM shop_members WHERE shop_id = v_invite.shop_id AND role = 'cashier';
      IF v_count >= v_limit THEN
        RAISE EXCEPTION 'plan_limit_members:%', v_limit;
      END IF;
    END IF;
  END IF;

  INSERT INTO shop_members (shop_id, user_id, role)
  VALUES (v_invite.shop_id, auth.uid(), v_invite.role)
  ON CONFLICT (shop_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE shop_invites SET status = 'accepted', responded_at = now() WHERE id = p_invite_id;

  RETURN jsonb_build_object('accepted', true, 'shop_id', v_invite.shop_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_shop_invite(UUID, BOOLEAN) TO authenticated;

COMMIT;

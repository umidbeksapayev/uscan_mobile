-- uscan mobile — Push token: qurilmani yangi foydalanuvchiga o'tkazish
--
-- Muammo: `registerPushToken` (notify.ts) `upsert(..., onConflict: 'token')`
-- qiladi. Expo push tokeni QURILMAGA bog'liq va hisob almashtirilganda
-- o'zgarmaydi. Shu sabab bitta telefonda ikkinchi hisob bilan kirilganda:
--   1) `push_tokens` da o'sha token allaqachon ESKI user nomiga yozilgan
--   2) ON CONFLICT → UPDATE yo'li ishlaydi
--   3) `push_tokens_own_update` policy'sining USING sharti
--      (`auth.uid() = user_id`) ESKI qator bo'yicha tekshiriladi → rad etadi
-- Natija: `new row violates row-level security policy (USING expression)`
-- va o'sha qurilma boshqa hech qachon push ro'yxatidan o'tolmaydi.
--
-- Nega policy'ni ochib qo'ymaymiz: `FOR UPDATE USING (true)` yozilsa,
-- PostgREST orqali filtrsiz PATCH yuborib BARCHA tokenlarni o'ziga
-- o'tkazib olish mumkin bo'lardi (hammaning bildirishnomasi bir kishiga
-- ketardi). Shuning uchun o'tkazish faqat shu funksiya ichida, aniq
-- token bo'yicha.
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–042. Orqaga mos:
-- eski `upsert` yo'li ham ishlayveradi (o'z tokeni bo'lsa).

BEGIN;

CREATE OR REPLACE FUNCTION public.save_push_token(
  p_token    TEXT,
  p_shop_id  UUID DEFAULT NULL,
  p_platform TEXT DEFAULT 'unknown'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'token_required';
  END IF;
  IF p_platform NOT IN ('ios', 'android', 'unknown') THEN
    RAISE EXCEPTION 'invalid_platform';
  END IF;
  -- Tokenni faqat O'ZI a'zo bo'lgan do'konga bog'lash mumkin — aks holda
  -- begona do'kon id'sini yozib, o'sha do'konning kunlik xulosasini olish
  -- mumkin bo'lardi (`get_push_summaries` shop bo'yicha yuboradi).
  IF p_shop_id IS NOT NULL AND NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'not_shop_member';
  END IF;

  -- Qurilma avval boshqa hisobda ishlatilgan bo'lsa — eski bog'lanishni
  -- uzamiz. Bu ATAYLAB: telefon endi shu foydalanuvchiniki, eski egasi
  -- bu qurilmaga push olishda davom etmasligi kerak.
  DELETE FROM push_tokens WHERE token = p_token AND user_id <> auth.uid();

  INSERT INTO push_tokens (user_id, shop_id, token, platform, updated_at)
  VALUES (auth.uid(), p_shop_id, p_token, p_platform, now())
  ON CONFLICT (token) DO UPDATE SET
    shop_id    = EXCLUDED.shop_id,
    platform   = EXCLUDED.platform,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_push_token(TEXT, UUID, TEXT) TO authenticated;

COMMIT;

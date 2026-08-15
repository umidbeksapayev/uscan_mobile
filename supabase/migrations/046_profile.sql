-- uscan mobile — Foydalanuvchi profili (ism + rasm)
--
-- Ilovada foydalanuvchining O'ZI haqidagi ekran yo'q edi: "Ko'proq" dagi tepa
-- karta emailni ko'rsatib, do'kon almashtirish oynasini ochardi; parolni
-- o'zgartirish esa faqat "chiqib → parolni unutdim" yo'li bilan mumkin edi.
-- Endi `/profile` ekrani bor va unga ism + rasm kerak.
--
-- ⚠️ Ma'lumot NEGA `profiles` da, `user_metadata` da EMAS: Supabase OAuth
-- identity ma'lumotini HAR KIRISHDA `raw_user_meta_data` ustiga qayta yozadi
-- — foydalanuvchi qo'ygan ism/rasm Google bilan keyingi kirishda Google
-- qiymatiga almashib ketardi. Qo'shimcha yutuq: xodimlar ro'yxatida ism
-- ko'rsatish kerak bo'lsa, ma'lumot allaqachon jadvalda.
--
-- ⚠️ `profiles` da `role` ustuni ham bor (012_super_admin_rbac.sql), shuning
-- uchun "o'z qatorini UPDATE" siyosati ATAYLAB BERILMAYDI — u bo'lsa
-- foydalanuvchi o'zini `super_admin` qilib qo'yishi mumkin edi. Yozish faqat
-- quyidagi SECURITY DEFINER funksiya orqali (`payments`/`subscriptions`
-- bilan bir xil naqsh).
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–045 (ikkala repo). Orqaga mos.

BEGIN;

-- =====================================================
-- 1) profiles — ism va rasm
-- =====================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name  TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =====================================================
-- 2) update_my_profile() — yagona yozish yo'li
--    NULL argument = "o'zgartirma", bo'sh satr = tozalash.
--    `role` ga TEGMAYDI (yuqoridagi izoh).
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name  TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Avtorizatsiya kerak';
  END IF;

  -- Profil qatori trigger bilan yaratiladi (012), lekin eski/chetdan
  -- kelgan foydalanuvchida bo'lmasligi mumkin — kafolatlaymiz.
  INSERT INTO profiles (id, role) VALUES (auth.uid(), 'owner')
  ON CONFLICT (id) DO NOTHING;

  UPDATE profiles SET
    full_name = CASE
      WHEN p_full_name IS NULL THEN full_name
      WHEN TRIM(p_full_name) = '' THEN NULL
      ELSE LEFT(TRIM(p_full_name), 80)
    END,
    avatar_url = CASE
      WHEN p_avatar_url IS NULL THEN avatar_url
      WHEN TRIM(p_avatar_url) = '' THEN NULL
      ELSE p_avatar_url
    END
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT) TO authenticated;

-- =====================================================
-- 3) avatars — PUBLIC bucket (chek EMAS: avatar maxfiy emas, signed URL
--    ortiqcha murakkablik bo'lardi — `product-images` bilan bir xil).
--    Yo'l: {user_id}/{uuid}.jpg — Storage RLS birinchi papkani tekshiradi.
--
--    `product-images` yaramaydi: u {shop_id} papkasi bo'yicha qulflangan,
--    avatar esa do'konga emas, ODAMGA tegishli (bir odam bir necha do'konda
--    bo'lishi mumkin; kassirda mahsulot ruxsati bo'lmasligi ham mumkin).
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Chekdan farqli o'laroq DELETE bor: avatar audit dalili emas, almashtirilsa
-- eskisini saqlashning ma'nosi yo'q (bucket ham shishib ketmasin).
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

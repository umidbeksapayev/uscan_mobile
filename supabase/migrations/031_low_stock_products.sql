-- uscan mobile — #4 server-side KAM-QOLDIQ (low-stock) ro'yxati
--
-- SHARED Supabase DB'da QO'LDA ishga tushiriladi (030 dan KEYIN).
-- Additiv: 1 ta yangi funksiya. RLS/jadval tegmaydi. Web buzilmaydi.
--
-- Sabab: client `getLowStockProducts` oldin `select("*")` bilan BUTUN katalogni
--   (cost_price ham!) tortib JS'da filtrlardi — katta katalogda sekin + tan narx
--   kassir qurilmasiga oqardi. Endi server `quantity <= low_stock_alert` ni
--   hisoblaydi va FAQAT kam qoldiqlarni, cost_price'SIZ qaytaradi.
--
-- Tamoyillar (030 bilan bir xil):
--  * SECURITY DEFINER + is_shop_member(p_shop_id) gate (a'zo bo'lmasa xato).
--  * cost_price RETURNS TABLE'ga UMUMAN kiritilmaydi — server darajasida himoya.
--  * shop_id (faol do'kon RLS/membership orqali).

BEGIN;

CREATE OR REPLACE FUNCTION get_low_stock_products(p_shop_id UUID)
RETURNS TABLE (
  id              UUID,
  shop_id         UUID,
  name            TEXT,
  sale_type       TEXT,
  selling_price   NUMERIC,
  quantity        NUMERIC,
  low_stock_alert NUMERIC,
  barcode         TEXT,
  image_url       TEXT,
  category_id     UUID,
  is_active       BOOLEAN,
  created_at      TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.shop_id,
    p.name::text,
    p.sale_type::text,
    p.selling_price,
    p.quantity,
    p.low_stock_alert,
    p.barcode::text,
    p.image_url::text,
    p.category_id,
    p.is_active,
    p.created_at
  FROM products p
  WHERE p.shop_id = p_shop_id
    AND p.is_active = true
    AND p.quantity <= p.low_stock_alert
  ORDER BY p.quantity ASC;
END;
$$;

COMMIT;

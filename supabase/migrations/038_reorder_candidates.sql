-- 038: Buyurtma maslahatchisi — qaysi tovar necha kunga yetadi
--
-- "Kam qoldiq" ro'yxati (031) faqat `quantity <= low_stock_alert` ni ko'radi,
-- ya'ni SOTUV TEZLIGINI hisobga olmaydi. Natijada kuniga 20 dona ketadigan
-- tovar 25 dona qoldiqda "yetarli" ko'rinadi (aslida bir kunga yetadi),
-- yiliga 3 dona sotiladigani esa 2 dona qoldiqda "kam" deb ogohlantiradi.
--
-- Bu funksiya o'rniga KUNLIK O'RTACHA sotuvni hisoblab, "necha kun qoldi"
-- degan savolga javob beradi — buyurtma qarori aynan shunga tayanadi.
--
-- ⚠️ `cost_price` qaytarilmaydi (AI ham shu funksiyani ishlatadi).
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–037. Orqaga mos.

BEGIN;

CREATE OR REPLACE FUNCTION get_reorder_candidates(
  p_shop_id UUID,
  p_days INT DEFAULT 30,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  name      TEXT,
  sale_type TEXT,
  quantity  NUMERIC,
  avg_daily NUMERIC,
  days_left NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_shop_id, 'view_reports') THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;

  RETURN QUERY
  WITH sold AS (
    SELECT si.product_id AS pid, SUM(si.quantity_sold) AS total
    FROM sale_items si
    WHERE si.shop_id = p_shop_id
      AND (si.sold_at AT TIME ZONE 'Asia/Tashkent')::date
          > (now() AT TIME ZONE 'Asia/Tashkent')::date - p_days
    GROUP BY si.product_id
    HAVING SUM(si.quantity_sold) > 0
  )
  SELECT
    p.id,
    p.name::text,
    p.sale_type::text,
    p.quantity,
    ROUND(sold.total / p_days, 3)::NUMERIC,
    -- Nolga bo'lish `HAVING total > 0` bilan chetlangan.
    ROUND(p.quantity / (sold.total / p_days), 1)::NUMERIC
  FROM products p
  JOIN sold ON sold.pid = p.id
  WHERE p.shop_id = p_shop_id
    AND p.is_active = true
  -- Eng tez tugaydigani birinchi.
  ORDER BY (p.quantity / (sold.total / p_days)) ASC
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
END;
$$;

COMMIT;

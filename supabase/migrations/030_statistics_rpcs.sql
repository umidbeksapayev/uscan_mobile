-- uscan mobile — F6+ Statistika sahifasi uchun RPC'lar
--
-- SHARED Supabase DB'da QO'LDA ishga tushiriladi (web migratsiyalari ≤029 dan KEYIN).
-- Additiv: faqat 2 ta yangi funksiya. RLS/jadval tegmaydi. Web buzilmaydi.
--
-- Tamoyillar:
--  * Ombor qiymati DB'da hisoblanadi (SUM(price*qty)) — client'ga barcha
--    mahsulotlarni tortib JS'da yig'ish YO'Q (xotira/qulash xavfi).
--  * Foyda TARIXIY tan narxidan (sale_items.cost_price_snapshot orqali
--    total_profit) — joriy cost_price'dan EMAS. Demak "taxminiy" emas, aniq.
--  * RBAC: tan narx / foyda faqat has_perm(view_cost); savdo moliya =
--    has_perm(view_reports). Ruxsat bo'lmasa cost maydonlari NULL qaytadi
--    (qiymat client'ga UMUMAN bormaydi — server darajasida himoya).
--  * shop_id (web'da "store" emas) — faol do'kon RLS/membership orqali.

BEGIN;

-- =====================================================
-- 1) get_inventory_stats — ombor qiymati (a'zo o'qiydi; cost = view_cost)
-- =====================================================
CREATE OR REPLACE FUNCTION get_inventory_stats(p_shop_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_can_cost BOOLEAN;
  v_count INT;
  v_unit_qty DECIMAL(16,3);
  v_weight_qty DECIMAL(16,3);
  v_retail DECIMAL(18,2);
  v_cost DECIMAL(18,2);
  v_low INT;
  v_out INT;
BEGIN
  IF NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  v_can_cost := has_perm(p_shop_id, 'view_cost');

  SELECT
    COUNT(*),
    COALESCE(SUM(quantity) FILTER (WHERE sale_type = 'unit'), 0),
    COALESCE(SUM(quantity) FILTER (WHERE sale_type = 'weight'), 0),
    COALESCE(SUM(selling_price * quantity), 0),
    COALESCE(SUM(cost_price * quantity), 0),
    COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= low_stock_alert),
    COUNT(*) FILTER (WHERE quantity <= 0)
  INTO v_count, v_unit_qty, v_weight_qty, v_retail, v_cost, v_low, v_out
  FROM products
  WHERE shop_id = p_shop_id AND is_active = true;

  RETURN jsonb_build_object(
    'product_count', v_count,
    'total_unit_qty', v_unit_qty,
    'total_weight_kg', v_weight_qty,
    'retail_value', v_retail,
    'cost_value', CASE WHEN v_can_cost THEN v_cost ELSE NULL END,
    'potential_profit', CASE WHEN v_can_cost THEN (v_retail - v_cost) ELSE NULL END,
    'low_stock_count', v_low,
    'out_of_stock_count', v_out,
    'can_view_cost', v_can_cost
  );
END;
$$;

-- =====================================================
-- 2) get_sales_stats — joriy + oldingi davr (foiz o'zgarish uchun)
--    Faqat view_reports. Foyda = view_cost. avg_check qaytarilgan
--    sotuvlarni HISOBGA OLMAYDI (RULE #3). Net = sotuv − qaytarish.
-- =====================================================
CREATE OR REPLACE FUNCTION get_sales_stats(p_shop_id UUID, p_days INT DEFAULT 7)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_can_cost BOOLEAN;
  v_today DATE := (now() AT TIME ZONE 'Asia/Tashkent')::date;
  -- joriy davr = oxirgi p_days kun (bugun ham); oldingi = undan oldingi p_days kun
  v_cur_start  TIMESTAMPTZ := ((v_today - (p_days - 1))::timestamp) AT TIME ZONE 'Asia/Tashkent';
  v_cur_end    TIMESTAMPTZ := ((v_today + 1)::timestamp) AT TIME ZONE 'Asia/Tashkent';
  v_prev_start TIMESTAMPTZ := ((v_today - (2 * p_days - 1))::timestamp) AT TIME ZONE 'Asia/Tashkent';
  -- agregatlar
  v_cur_rev DECIMAL(18,2); v_cur_prof DECIMAL(18,2); v_cur_cnt INT;
  v_cur_ref DECIMAL(18,2); v_cur_rprof DECIMAL(18,2);
  v_prev_rev DECIMAL(18,2); v_prev_prof DECIMAL(18,2); v_prev_cnt INT;
  v_prev_ref DECIMAL(18,2); v_prev_rprof DECIMAL(18,2);
  v_ac_rev DECIMAL(18,2); v_ac_cnt INT; v_avg DECIMAL(18,2);
  v_net_rev DECIMAL(18,2); v_net_prof DECIMAL(18,2);
  v_pnet_rev DECIMAL(18,2); v_pnet_prof DECIMAL(18,2);
BEGIN
  IF NOT has_perm(p_shop_id, 'view_reports') THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;
  v_can_cost := has_perm(p_shop_id, 'view_cost');

  -- Joriy davr sotuvlari
  SELECT COALESCE(SUM(total_revenue),0), COALESCE(SUM(total_profit),0), COUNT(*)
  INTO v_cur_rev, v_cur_prof, v_cur_cnt
  FROM sales WHERE shop_id = p_shop_id AND sold_at >= v_cur_start AND sold_at < v_cur_end;

  SELECT COALESCE(SUM(r.total_refund),0), COALESCE(SUM(r.total_profit),0)
  INTO v_cur_ref, v_cur_rprof
  FROM returns r JOIN sales s ON s.id = r.sale_id
  WHERE r.shop_id = p_shop_id AND s.sold_at >= v_cur_start AND s.sold_at < v_cur_end;

  -- Oldingi davr sotuvlari
  SELECT COALESCE(SUM(total_revenue),0), COALESCE(SUM(total_profit),0), COUNT(*)
  INTO v_prev_rev, v_prev_prof, v_prev_cnt
  FROM sales WHERE shop_id = p_shop_id AND sold_at >= v_prev_start AND sold_at < v_cur_start;

  SELECT COALESCE(SUM(r.total_refund),0), COALESCE(SUM(r.total_profit),0)
  INTO v_prev_ref, v_prev_rprof
  FROM returns r JOIN sales s ON s.id = r.sale_id
  WHERE r.shop_id = p_shop_id AND s.sold_at >= v_prev_start AND s.sold_at < v_cur_start;

  -- O'rtacha chek: qaytarilgan sotuvlarni CHIQARIB tashlaymiz (RULE #3)
  SELECT COALESCE(SUM(s.total_revenue),0), COUNT(*)
  INTO v_ac_rev, v_ac_cnt
  FROM sales s
  WHERE s.shop_id = p_shop_id AND s.sold_at >= v_cur_start AND s.sold_at < v_cur_end
    AND NOT EXISTS (SELECT 1 FROM returns r WHERE r.sale_id = s.id);
  v_avg := CASE WHEN v_ac_cnt > 0 THEN ROUND(v_ac_rev / v_ac_cnt, 2) ELSE 0 END;

  v_net_rev   := v_cur_rev - v_cur_ref;
  v_net_prof  := v_cur_prof - v_cur_rprof;
  v_pnet_rev  := v_prev_rev - v_prev_ref;
  v_pnet_prof := v_prev_prof - v_prev_rprof;

  RETURN jsonb_build_object(
    'revenue', v_net_rev,
    'sales_count', v_cur_cnt,
    'avg_check', v_avg,
    'profit', CASE WHEN v_can_cost THEN v_net_prof ELSE NULL END,
    'prev_revenue', v_pnet_rev,
    'prev_sales_count', v_prev_cnt,
    'prev_profit', CASE WHEN v_can_cost THEN v_pnet_prof ELSE NULL END,
    'can_view_cost', v_can_cost
  );
END;
$$;

COMMIT;

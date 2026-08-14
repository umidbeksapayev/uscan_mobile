-- uscan mobile — Anomaliya alerti (qoidaga asoslangan, Gemini EMAS)
--
-- Bildirishnomalar markazi (`use-alerts.ts` + `alerts-math.ts`) uchun uchta
-- deterministik signal — kvota sarflamaydi, oddiy SQL chegara:
--  1) Zararli sotuv — tan narxdan past sotilgan qatorlar (oxirgi 7 kun)
--  2) Qaytarish sakrashi — bugungi son oxirgi 14 kunlik o'rtachadan
--     sezilarli oshgan (bo'sh bazada soxta signal bermasligi uchun eng
--     kami 3 ta shart)
--  3) Kassa kamomadi — oxirgi 7 kunlik yopilishlarda katta salbiy farq
--
-- Uchalasi ham tan narx/foyda bilan bog'liq — shuning uchun FAQAT EGASI
-- (`is_shop_owner`, AI migratsiyalari — 034-038 — bilan bir xil shart;
-- statistika RPC'laridagi moslashuvchan `has_perm(view_cost)` emas —
-- bu yerda cheklov ataylab soddaligicha qoldirilgan).
--
-- ⚠️ Supabase SQL Editor da bajaring. Avval 001–038. Orqaga mos.

BEGIN;

CREATE OR REPLACE FUNCTION get_shop_anomalies(p_shop_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_loss_count   INT;
  v_loss_amount  DECIMAL(14,2);
  v_returns_today INT;
  v_returns_avg  DECIMAL;
  v_cash_count   INT;
  v_cash_amount  DECIMAL(14,2);
BEGIN
  IF NOT is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q';
  END IF;

  -- 1) Zararli sotuv: sotuv narxi tan narxdan >2% past (yaxlitlash shovqini
  --    kesiladi — 1-2 tiyinlik farq anomaliya emas).
  SELECT COUNT(*), COALESCE(SUM((cost_price_snapshot - selling_price_snapshot) * quantity_sold), 0)
  INTO v_loss_count, v_loss_amount
  FROM sale_items
  WHERE shop_id = p_shop_id
    AND sold_at >= now() - INTERVAL '7 days'
    AND selling_price_snapshot < cost_price_snapshot * 0.98;

  -- 2) Qaytarish sakrashi: bugun (Toshkent) vs oldingi 14 kunlik kunlik o'rtacha.
  SELECT COUNT(*) INTO v_returns_today
  FROM returns
  WHERE shop_id = p_shop_id
    AND (created_at AT TIME ZONE 'Asia/Tashkent')::date
        = (now() AT TIME ZONE 'Asia/Tashkent')::date;

  SELECT COUNT(*) / 14.0 INTO v_returns_avg
  FROM returns
  WHERE shop_id = p_shop_id
    AND created_at >= now() - INTERVAL '14 days'
    AND (created_at AT TIME ZONE 'Asia/Tashkent')::date
        < (now() AT TIME ZONE 'Asia/Tashkent')::date;

  -- 3) Kassa kamomadi: farq -10 000 so'mdan past YOKI kutilgan naqdning
  --    5%'idan ko'proq kam (qaysi biri sezilarliroq bo'lsa).
  SELECT COUNT(*), COALESCE(SUM(difference), 0)
  INTO v_cash_count, v_cash_amount
  FROM cash_closures
  WHERE shop_id = p_shop_id
    AND created_at >= now() - INTERVAL '7 days'
    AND (difference <= -10000 OR (expected_cash > 0 AND difference <= -0.05 * expected_cash));

  RETURN jsonb_build_object(
    'loss_sales_count', v_loss_count,
    'loss_sales_amount', v_loss_amount,
    'returns_today', v_returns_today,
    'returns_spike', v_returns_today >= GREATEST(3, CEIL(COALESCE(v_returns_avg, 0) * 2)),
    'cash_shortfall_count', v_cash_count,
    'cash_shortfall_amount', v_cash_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shop_anomalies(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- FINAL MERCHANT BILLING SYSTEM FIX (V3 - COMPLETE)
-- Includes: Rule Engine, Realtime Fix, Security Fix, and Data Sync
-- ============================================================================

BEGIN;

-- 1. RULE ENGINE: Fixed function with safe defaults (No more NULLs)
CREATE OR REPLACE FUNCTION get_pharmacy_billing_rules(p_pharmacy_id UUID)
RETURNS TABLE (
  monthly_fee_cents INTEGER,
  free_orders_per_period INTEGER,
  overage_percent_bp INTEGER,
  overage_fixed_fee_cents INTEGER,
  block_after_free_limit BOOLEAN
) AS $$
DECLARE
    _monthly_fee INTEGER := 0;
    _free_orders INTEGER := 30; -- Default 30 orders
    _overage_percent INTEGER := 0;
    _overage_fixed INTEGER := 100;
    _block_limit BOOLEAN := false;
BEGIN
    -- Etapa 1: Global
    SELECT 
        COALESCE(g.monthly_fee_cents, _monthly_fee),
        COALESCE(g.free_orders_per_period, _free_orders),
        COALESCE(g.overage_percent_bp, _overage_percent),
        COALESCE(g.overage_fixed_fee_cents, _overage_fixed),
        COALESCE(g.block_after_free_limit, _block_limit)
    INTO _monthly_fee, _free_orders, _overage_percent, _overage_fixed, _block_limit
    FROM billing_global_config g WHERE g.config_key = 'default_plan_settings' LIMIT 1;

    -- Etapa 2: Plano da Assinatura
    SELECT 
        COALESCE(bp.monthly_fee_cents, _monthly_fee),
        COALESCE(bp.free_orders_per_period, _free_orders),
        COALESCE(bp.overage_percent_bp, _overage_percent),
        COALESCE(bp.overage_fixed_fee_cents, _overage_fixed),
        COALESCE(bp.block_after_free_limit, _block_limit)
    INTO _monthly_fee, _free_orders, _overage_percent, _overage_fixed, _block_limit
    FROM pharmacy_subscriptions s
    JOIN billing_plans bp ON bp.id = s.plan_id
    WHERE s.pharmacy_id = p_pharmacy_id AND s.status = 'active' LIMIT 1;

    -- Etapa 3: Contrato Customizado
    SELECT 
        COALESCE(pc.monthly_fee_cents, _monthly_fee),
        COALESCE(pc.free_orders_per_period, _free_orders),
        COALESCE(pc.overage_percent_bp, _overage_percent),
        COALESCE(pc.overage_fixed_fee_cents, _overage_fixed),
        COALESCE(pc.block_after_free_limit, _block_limit)
    INTO _monthly_fee, _free_orders, _overage_percent, _overage_fixed, _block_limit
    FROM pharmacy_contracts pc
    WHERE pc.pharmacy_id = p_pharmacy_id AND pc.valid_from <= CURRENT_DATE 
    AND (pc.valid_until IS NULL OR pc.valid_until >= CURRENT_DATE)
    ORDER BY pc.created_at DESC LIMIT 1;

    RETURN QUERY SELECT 
        COALESCE(_monthly_fee, 0),
        COALESCE(_free_orders, 0),
        COALESCE(_overage_percent, 0),
        COALESCE(_overage_fixed, 0),
        COALESCE(_block_limit, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. DATABASE STATE: Clean up duplicates and ensure 30-day consistency
DELETE FROM billing_cycles bc
WHERE bc.status = 'active'
AND bc.id NOT IN (
    SELECT DISTINCT ON (pharmacy_id) id
    FROM billing_cycles
    WHERE status = 'active'
    ORDER BY pharmacy_id, period_start DESC
);

UPDATE billing_cycles 
SET period_end = period_start + INTERVAL '30 days'
WHERE status = 'active' AND (period_end - period_start) <> 30;

-- 3. REALTIME & SECURITY: Fix "mismatch" and RLS
ALTER TABLE billing_cycles REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Managers can see their own billing cycles" ON billing_cycles;
CREATE POLICY "Managers can see their own billing cycles" 
ON billing_cycles FOR SELECT 
TO authenticated
USING (
  pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()) OR
  pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid())
);

-- 4. CORE LOGIC: The "Rolling" Trigger
CREATE OR REPLACE FUNCTION public.increment_billing_cycle_on_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle_id UUID;
    v_rules RECORD;
    v_overage_value INTEGER;
BEGIN
    IF (NEW.status IN ('entregue', 'delivered')) AND (OLD.status IS NULL OR OLD.status NOT IN ('entregue', 'delivered')) THEN
        SELECT id INTO v_cycle_id FROM billing_cycles
        WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
        AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
        ORDER BY period_start DESC LIMIT 1;

        IF v_cycle_id IS NULL THEN
            INSERT INTO billing_cycles (pharmacy_id, period_start, period_end, status)
            VALUES (NEW.pharmacy_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active')
            ON CONFLICT (pharmacy_id, period_start) DO UPDATE SET status = 'active'
            RETURNING id INTO v_cycle_id;
        END IF;

        SELECT * INTO v_rules FROM get_pharmacy_billing_rules(NEW.pharmacy_id);

        IF (SELECT free_orders_used FROM billing_cycles WHERE id = v_cycle_id) < COALESCE(v_rules.free_orders_per_period, 0) THEN
            UPDATE billing_cycles SET free_orders_used = free_orders_used + 1, updated_at = NOW() WHERE id = v_cycle_id;
        ELSE
            v_overage_value := COALESCE(v_rules.overage_fixed_fee_cents, 100);
            IF COALESCE(v_rules.overage_percent_bp, 0) > 0 THEN
                v_overage_value := v_overage_value + (NEW.total_price * v_rules.overage_percent_bp / 10000);
            END IF;
            UPDATE billing_cycles SET overage_orders = overage_orders + 1, overage_amount_cents = overage_amount_cents + v_overage_value, updated_at = NOW() WHERE id = v_cycle_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON public.orders;
CREATE TRIGGER trigger_increment_billing_cycle
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.increment_billing_cycle_on_order_delivered();

-- 5. FORÇA BRUTA: Sincronizar dados agora
DO $$
DECLARE
    r RECORD;
    v_lim INTEGER;
BEGIN
    FOR r IN SELECT * FROM billing_cycles WHERE status = 'active' LOOP
        SELECT free_orders_per_period INTO v_lim FROM get_pharmacy_billing_rules(r.pharmacy_id);
        
        UPDATE billing_cycles bc SET free_orders_used = (
            SELECT count(*) FROM orders o 
            WHERE o.pharmacy_id = bc.pharmacy_id AND o.status IN ('entregue', 'delivered')
            AND COALESCE(o.delivered_at, o.created_at)::date >= bc.period_start
            AND COALESCE(o.delivered_at, o.created_at)::date <= bc.period_end
        ) WHERE id = r.id;

        UPDATE billing_cycles SET 
            overage_orders = CASE WHEN free_orders_used > v_lim THEN free_orders_used - v_lim ELSE 0 END,
            free_orders_used = CASE WHEN free_orders_used > v_lim THEN v_lim ELSE free_orders_used END
        WHERE id = r.id;
    END LOOP;
END $$;

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT p.name, bc.free_orders_used, bc.overage_orders, bc.period_start, bc.period_end
FROM billing_cycles bc JOIN pharmacies p ON p.id = bc.pharmacy_id WHERE bc.status = 'active';

-- ============================================================================
-- MIGRATION: Fix Billing Constraints (Safe Parser Version)
-- Updated with Asaas Integration Columns & Admin View
-- ============================================================================

-- 1. Ensure columns exist on PHARMACIES (BLOCK 1)
DO $block$
BEGIN
    -- asaas_customer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'asaas_customer_id') THEN
        ALTER TABLE pharmacies ADD COLUMN asaas_customer_id TEXT;
    END IF;

    -- asaas_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'asaas_status') THEN
        ALTER TABLE pharmacies ADD COLUMN asaas_status TEXT DEFAULT 'pending';
    END IF;

    -- asaas_last_error
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'asaas_last_error') THEN
        ALTER TABLE pharmacies ADD COLUMN asaas_last_error TEXT;
    END IF;

    -- asaas_updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'asaas_updated_at') THEN
        ALTER TABLE pharmacies ADD COLUMN asaas_updated_at TIMESTAMPTZ;
    END IF;
END $block$;

-- ============================================================================

-- 2. Ensure columns exist on PHARMACY_SUBSCRIPTIONS (BLOCK 2)
DO $block$
BEGIN
    -- asaas_subscription_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_subscription_id') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_subscription_id TEXT;
    END IF;

    -- next_billing_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'next_billing_date') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN next_billing_date DATE;
    END IF;

    -- asaas_last_error
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_last_error') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_last_error TEXT;
    END IF;

    -- asaas_updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_updated_at') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_updated_at TIMESTAMPTZ;
    END IF;

    -- ended_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'ended_at') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN ended_at TIMESTAMPTZ;
    END IF;
END $block$;

-- ============================================================================

-- 3. Clean up duplicates (BLOCK 3 - Uses Dynamic SQL)
DO $block$
BEGIN
    EXECUTE '
        WITH ranked AS (
          SELECT id, pharmacy_id, 
                 ROW_NUMBER() OVER (
                   PARTITION BY pharmacy_id 
                   ORDER BY started_at DESC NULLS LAST, created_at DESC
                 ) as rn
          FROM pharmacy_subscriptions
          WHERE status = ''active''
        )
        UPDATE pharmacy_subscriptions s
        SET status = ''canceled'', 
            ended_at = NOW()
        FROM ranked r
        WHERE s.id = r.id AND r.rn > 1;
    ';
END $block$;

-- ============================================================================

-- 4. Enforce single active subscription per pharmacy (BLOCK 4)
-- ============================================================================

DROP INDEX IF EXISTS uniq_active_subscription_per_pharmacy;

CREATE UNIQUE INDEX uniq_active_subscription_per_pharmacy
ON pharmacy_subscriptions (pharmacy_id)
WHERE status = 'active';

-- ============================================================================

-- 5. Create Admin View for Asaas Pending Items (BLOCK 5)
-- ============================================================================

CREATE OR REPLACE VIEW v_asaas_pending AS
SELECT
  p.id as pharmacy_id,
  p.name as pharmacy_name,
  p.cnpj,
  p.owner_email,
  p.owner_phone,
  COALESCE(p.asaas_status, 'pending') as asaas_status,
  p.asaas_customer_id,
  p.asaas_last_error as customer_error,
  s.id as subscription_id,
  s.status as subscription_status,
  s.asaas_subscription_id,
  s.asaas_last_error as subscription_error,
  bp.name as plan_name,
  bp.monthly_fee_cents,
  p.created_at
FROM pharmacies p
LEFT JOIN pharmacy_subscriptions s
  ON s.pharmacy_id = p.id
LEFT JOIN billing_plans bp
  ON bp.id = s.plan_id
WHERE COALESCE(p.asaas_status, 'pending') <> 'ok'
   OR (bp.monthly_fee_cents > 0 AND (s.status = 'pending_asaas' OR s.asaas_subscription_id IS NULL))
ORDER BY p.created_at DESC;

-- ============================================================================

-- 6. Verification Log (BLOCK 6)
DO $block$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM pg_indexes 
    WHERE indexname = 'uniq_active_subscription_per_pharmacy';
    
    RAISE NOTICE 'Billing constraints applied. Unique Status: %. Admin View created.', (v_count > 0);
END $block$;

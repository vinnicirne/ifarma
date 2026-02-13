-- ============================================================================
-- FIX: Adicionar colunas estruturadas na billing_global_config
-- ============================================================================

-- 1. Adicionar colunas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_global_config' AND column_name = 'monthly_fee_cents') THEN
        ALTER TABLE billing_global_config ADD COLUMN monthly_fee_cents INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_global_config' AND column_name = 'free_orders_per_period') THEN
        ALTER TABLE billing_global_config ADD COLUMN free_orders_per_period INTEGER NOT NULL DEFAULT 10;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_global_config' AND column_name = 'overage_percent_bp') THEN
        ALTER TABLE billing_global_config ADD COLUMN overage_percent_bp INTEGER NOT NULL DEFAULT 500;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_global_config' AND column_name = 'overage_fixed_fee_cents') THEN
        ALTER TABLE billing_global_config ADD COLUMN overage_fixed_fee_cents INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_global_config' AND column_name = 'block_after_free_limit') THEN
        ALTER TABLE billing_global_config ADD COLUMN block_after_free_limit BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 2. Migrar dados do JSON (config_value) para colunas (se houver dados)
DO $$
DECLARE
    v_val JSONB;
BEGIN
    SELECT config_value::jsonb INTO v_val FROM billing_global_config WHERE config_key = 'default_plan_settings' LIMIT 1;
    
    IF v_val IS NOT NULL THEN
        UPDATE billing_global_config SET
            monthly_fee_cents = COALESCE((v_val->>'monthly_fee_cents')::integer, 0),
            free_orders_per_period = COALESCE((v_val->>'free_orders_per_period')::integer, 10),
            overage_percent_bp = COALESCE((v_val->>'overage_percent_bp')::integer, 500),
            overage_fixed_fee_cents = COALESCE((v_val->>'overage_fixed_fee_cents')::integer, 0),
            block_after_free_limit = COALESCE((v_val->>'block_after_free_limit')::boolean, FALSE)
        WHERE config_key = 'default_plan_settings';
    END IF;
END $$;

-- 3. Inserir registro default se não existir
INSERT INTO billing_global_config (config_key, monthly_fee_cents, free_orders_per_period, overage_percent_bp, config_value)
VALUES ('default_plan_settings', 0, 10, 500, '{}')
ON CONFLICT (config_key) DO NOTHING;

-- 4. Verificar
SELECT config_key, monthly_fee_cents, free_orders_per_period, overage_percent_bp FROM billing_global_config;

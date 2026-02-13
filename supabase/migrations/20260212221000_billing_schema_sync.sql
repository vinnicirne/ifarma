-- ============================================================================
-- PATCH COMPLETO: Sincronizar schema de billing com a versão FIXED
-- ============================================================================

-- 1. billing_invoices: Adicionar colunas faltantes
DO $$
BEGIN
    -- asaas_invoice_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_id'
    ) THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_invoice_id TEXT;
    END IF;

    -- asaas_invoice_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_url'
    ) THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_invoice_url TEXT;
    END IF;
END $$;

-- 2. Criar constraint UNIQUE em asaas_invoice_id (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'billing_invoices_asaas_invoice_id_key'
    ) THEN
        -- Primeiro, garantir que não há duplicatas
        UPDATE billing_invoices 
        SET asaas_invoice_id = gen_random_uuid()::text 
        WHERE asaas_invoice_id IS NULL;
        
        ALTER TABLE billing_invoices 
        ADD CONSTRAINT billing_invoices_asaas_invoice_id_key UNIQUE (asaas_invoice_id);
    END IF;
END $$;

-- 3. Criar índice em asaas_invoice_id
CREATE INDEX IF NOT EXISTS idx_billing_invoices_asaas_id ON billing_invoices(asaas_invoice_id);

-- 4. billing_audit_log: Criar se não existir
CREATE TABLE IF NOT EXISTS billing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Criar índices em billing_audit_log
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_table ON billing_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_record ON billing_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_changed_by ON billing_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_billing_audit_log_changed_at ON billing_audit_log(changed_at);

-- 6. Garantir que a função update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Garantir que a função log_billing_changes existe
CREATE OR REPLACE FUNCTION log_billing_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO billing_audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'created', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO billing_audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO billing_audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Garantir que a função get_pharmacy_billing_rules existe
CREATE OR REPLACE FUNCTION get_pharmacy_billing_rules(p_pharmacy_id UUID)
RETURNS TABLE (
  monthly_fee_cents INTEGER,
  free_orders_per_period INTEGER,
  overage_percent_bp INTEGER,
  overage_fixed_fee_cents INTEGER,
  block_after_free_limit BOOLEAN
) AS $$
DECLARE
  v_contract RECORD;
  v_subscription RECORD;
  v_plan RECORD;
  v_global RECORD;
BEGIN
  -- 1. Buscar contrato ativo
  SELECT * INTO v_contract
  FROM pharmacy_contracts
  WHERE pharmacy_id = p_pharmacy_id
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Buscar assinatura ativa
  SELECT * INTO v_subscription
  FROM pharmacy_subscriptions
  WHERE pharmacy_id = p_pharmacy_id
    AND status = 'active'
  LIMIT 1;

  -- 3. Buscar plano
  IF v_subscription IS NOT NULL THEN
    SELECT * INTO v_plan
    FROM billing_plans
    WHERE id = v_subscription.plan_id;
  END IF;

  -- 4. Buscar config global
  SELECT * INTO v_global
  FROM billing_global_config
  WHERE config_key = 'default_plan_settings'
  LIMIT 1;

  -- Retornar valores resolvidos
  RETURN QUERY SELECT
    COALESCE(v_contract.override_monthly_fee_cents, v_plan.monthly_fee_cents, v_global.monthly_fee_cents, 0),
    COALESCE(v_contract.override_free_orders, v_plan.free_orders_per_period, v_global.free_orders_per_period, 0),
    COALESCE(v_contract.override_overage_percent_bp, v_plan.overage_percent_bp, v_global.overage_percent_bp, 0),
    COALESCE(v_contract.override_overage_fixed_fee_cents, v_plan.overage_fixed_fee_cents, v_global.overage_fixed_fee_cents, 0),
    COALESCE(v_contract.override_block_after_limit, v_plan.block_after_free_limit, v_global.block_after_free_limit, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Garantir que o trigger automático existe
CREATE OR REPLACE FUNCTION increment_billing_cycle_on_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_cycle RECORD;
  v_rules RECORD;
  v_overage_value INTEGER;
BEGIN
  -- Só processa se o pedido foi marcado como "delivered"
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    
    -- Buscar ciclo ativo
    SELECT * INTO v_cycle
    FROM billing_cycles
    WHERE pharmacy_id = NEW.pharmacy_id
      AND status = 'active'
    LIMIT 1;

    IF v_cycle IS NULL THEN
      RETURN NEW;
    END IF;

    -- Buscar regras
    SELECT * INTO v_rules
    FROM get_pharmacy_billing_rules(NEW.pharmacy_id);

    -- Incrementar contador
    IF v_cycle.free_orders_used < v_rules.free_orders_per_period THEN
      UPDATE billing_cycles
      SET free_orders_used = free_orders_used + 1,
          updated_at = NOW()
      WHERE id = v_cycle.id;
    ELSE
      v_overage_value := 0;
      
      IF v_rules.overage_percent_bp > 0 THEN
        v_overage_value := v_overage_value + (NEW.total_price * v_rules.overage_percent_bp / 10000);
      END IF;
      
      IF v_rules.overage_fixed_fee_cents > 0 THEN
        v_overage_value := v_overage_value + v_rules.overage_fixed_fee_cents;
      END IF;

      UPDATE billing_cycles
      SET overage_orders = overage_orders + 1,
          overage_amount_cents = overage_amount_cents + v_overage_value,
          updated_at = NOW()
      WHERE id = v_cycle.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 10. Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON orders;
CREATE TRIGGER trigger_increment_billing_cycle
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_billing_cycle_on_order_delivered();

-- 11. Criar triggers de auditoria
DROP TRIGGER IF EXISTS audit_billing_plans ON billing_plans;
CREATE TRIGGER audit_billing_plans
  AFTER INSERT OR UPDATE OR DELETE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION log_billing_changes();

DROP TRIGGER IF EXISTS audit_pharmacy_contracts ON pharmacy_contracts;
CREATE TRIGGER audit_pharmacy_contracts
  AFTER INSERT OR UPDATE OR DELETE ON pharmacy_contracts
  FOR EACH ROW EXECUTE FUNCTION log_billing_changes();

DROP TRIGGER IF EXISTS audit_billing_policy ON billing_policy;
CREATE TRIGGER audit_billing_policy
  AFTER INSERT OR UPDATE OR DELETE ON billing_policy
  FOR EACH ROW EXECUTE FUNCTION log_billing_changes();

-- ============================================================================
-- FIM DO PATCH
-- ============================================================================

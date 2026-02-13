-- ============================================================================
-- FIX COMPLETO: Recriar billing_global_config com estrutura correta
-- ============================================================================

-- 1. Dropar e recriar billing_global_config
DROP TABLE IF EXISTS billing_global_config CASCADE;

CREATE TABLE billing_global_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed data
INSERT INTO billing_global_config (config_key, config_value, description)
VALUES ('default_plan_settings', '{"free_orders_per_period": 10, "overage_percent_bp": 500}', 'Configuração padrão de fallback');

-- 3. RLS
ALTER TABLE billing_global_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage global config" ON billing_global_config;
CREATE POLICY "Admin manage global config" ON billing_global_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can view global config" ON billing_global_config;
CREATE POLICY "Anyone can view global config" ON billing_global_config
  FOR SELECT USING (true);

-- 4. Índice
CREATE INDEX IF NOT EXISTS idx_billing_global_config_key ON billing_global_config(config_key);

-- 5. Trigger de auditoria
DROP TRIGGER IF EXISTS audit_billing_global_config ON billing_global_config;
CREATE TRIGGER audit_billing_global_config
  AFTER INSERT OR UPDATE OR DELETE ON billing_global_config
  FOR EACH ROW EXECUTE FUNCTION log_billing_changes();

-- 6. Verificar
SELECT config_key, config_value FROM billing_global_config;

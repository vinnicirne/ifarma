-- ============================================
-- IFARMA ELITE 2.0: TELEMETRIA E CONTROLE
-- ============================================

-- 1. Melhorar Tabela de Farmácias
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS total_orders_month INTEGER DEFAULT 0;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS order_limit INTEGER DEFAULT 15; -- Padrão Gratuito

-- 2. Melhorar Tabela de Perfis (Telemetria Motoboy)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signal_status TEXT; -- '4G', '5G', 'Wifi', 'Sem Sinal'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_online TIMESTAMPTZ;

-- 3. Função para atualizar último acesso da farmácia automaticamente
CREATE OR REPLACE FUNCTION update_pharmacy_last_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'merchant' AND NEW.pharmacy_id IS NOT NULL THEN
    UPDATE pharmacies 
    SET last_access = NOW()
    WHERE id = NEW.pharmacy_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar acesso ao mudar status/perfil
DROP TRIGGER IF EXISTS tr_update_pharmacy_access ON profiles;
CREATE TRIGGER tr_update_pharmacy_access
  AFTER UPDATE OF last_online ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmacy_last_access();

-- 4. Criar Tabela de Configurações de Planos (Opcional, mas Elite)
CREATE TABLE IF NOT EXISTS plan_settings (
  plan_name TEXT PRIMARY KEY,
  max_orders_month INTEGER,
  features JSONB
);

INSERT INTO plan_settings (plan_name, max_orders_month, features)
VALUES 
  ('Gratuito', 15, '{"priority": false, "ads": false}'),
  ('Bronze', 50, '{"priority": true, "ads": false}'),
  ('Prata', 200, '{"priority": true, "ads": true}'),
  ('Ouro', 999999, '{"priority": true, "ads": true, "vip_support": true}')
ON CONFLICT (plan_name) DO UPDATE SET max_orders_month = EXCLUDED.max_orders_month;

-- 5. Comentários para Documentação
COMMENT ON COLUMN profiles.battery_level IS 'Nível de bateria do dispositivo do motoboy (0-100)';
COMMENT ON COLUMN profiles.signal_status IS 'Qualidade da conexão do motoboy';

-- ============================================
-- TELEMETRIA: Suporte a Bateria e Tráfego Real
-- ============================================

-- 1. Adicionar colunas de bateria na tabela de perfis
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS is_charging BOOLEAN DEFAULT false;

-- 2. Índice para monitoramento rápido
CREATE INDEX IF NOT EXISTS idx_profiles_battery ON profiles(battery_level) WHERE role = 'motoboy';

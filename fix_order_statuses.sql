-- Padronização de Status de Pedido para o Fluxo Uber-Style
DO $$ 
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'em_rota', 'entregue', 'cancelado'));
END $$;

-- Garantir que as colunas de telemetria existam
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signal_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_charging BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Coluna para marcar quando o motoboy chegou (para geofencing manual)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS motoboy_arrived_at TIMESTAMP WITH TIME ZONE;

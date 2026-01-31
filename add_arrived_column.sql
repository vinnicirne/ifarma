-- Adiciona a coluna para registrar o momento de chegada do motoboy
ALTER TABLE IF EXISTS orders 
ADD COLUMN IF NOT EXISTS motoboy_arrived_at TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN orders.motoboy_arrived_at IS 'Data e hora em que o motoboy sinalizou que chegou ao destino para entrega.';

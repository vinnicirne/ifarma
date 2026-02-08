-- Adicionar colunas faltantes na tabela orders para suporte ao Motoboy App
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS motoboy_arrived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_sequence INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;

-- Garantir que a tabela route_history existe (para rastreamento)
CREATE TABLE IF NOT EXISTS route_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_route_history_motoboy ON route_history(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_route_history_order ON route_history(order_id);

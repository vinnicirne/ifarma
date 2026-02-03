-- ============================================
-- SEGURANÇA E AUDITORIA: Geofencing, POD e Replay
-- ============================================

-- 1. Tabela de Histórico de Localização para Replay de Rota
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motoboy_id UUID REFERENCES auth.users(id),
    order_id UUID REFERENCES orders(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Coluna para Foto de Entrega (POD) na tabela de pedidos
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- 3. Índices para performance de busca histórica
CREATE INDEX IF NOT EXISTS idx_location_history_order_id ON location_history(order_id);
CREATE INDEX IF NOT EXISTS idx_location_history_motoboy_id ON location_history(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at);

-- 4. RLS para Histórico de Localização
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver histórico de suas entregas"
ON location_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN pharmacies ph ON o.pharmacy_id = ph.id
        JOIN profiles p ON ph.id = p.pharmacy_id
        WHERE o.id = location_history.order_id 
        AND p.id = auth.uid()
    )
);

CREATE POLICY "Motoboys podem inserir sua própria localização"
ON location_history FOR INSERT
WITH CHECK (auth.uid() = motoboy_id);

-- 5. Bucket para Fotos de Entrega
-- Nota: O bucket 'deliveries' deve ser criado manualmente no painel Storage do Supabase
-- Ou via script se as extensões permitirem

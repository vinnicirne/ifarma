-- FIX CRÍTICO: Adicionar campo cancellation_reason à tabela orders
-- Este campo é necessário para o funcionamento do cancelamento de pedidos

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Adicionar também campos que podem estar faltando baseado no código
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS receiver_name TEXT,
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motoboy_arrived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_sequence INTEGER,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;

-- Atualizar CHECK constraint para incluir novos status se necessário
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'em_rota', 'entregue', 'cancelado'));

SELECT 'Orders table updated with missing columns including cancellation_reason' as result;

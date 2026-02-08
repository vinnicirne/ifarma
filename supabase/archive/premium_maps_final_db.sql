-- ====================================================================
-- FINAL PREMIUM MAPS DATABASE UPDATE (v1.4 - BULLLETPROOF VERSION)
-- Data: 2026-02-08
-- Objetivo: Suporte a Polylines, Unificação de Status e Correção de RLS
-- ====================================================================

-- 1. ADICIONAR COLUNAS PREMIUM NA TABELA ORDERS
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS route_polyline TEXT, 
ADD COLUMN IF NOT EXISTS route_distance_text TEXT, 
ADD COLUMN IF NOT EXISTS route_duration_text TEXT;

-- 2. ATUALIZAR CONSTRAINT DE STATUS PARA O FLUXO COMPLETO DO MOTOBOY
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',           -- Aguardando aceitação da farmácia
    'preparando',         -- Farmácia separando os produtos
    'aguardando_motoboy', -- Disponível para o pool de entregadores
    'aceito',             -- Motoboy aceitou mas ainda não chegou na farmácia
    'pronto_entrega',     -- Aguardando retirada na farmácia
    'aguardando_retirada',-- Status auxiliar
    'retirado',           -- Motoboy pegou o produto e confirmou coleta
    'em_rota',            -- Motoboy a caminho do cliente (Navigation Mode)
    'entregue',           -- Finalizado com sucesso
    'cancelado'           -- Cancelado
));

-- 3. GARANTIR TABELA E PADRONIZAÇÃO DO HISTÓRICO DE ROTA
-- Criamos se não existir para evitar erros de referência
CREATE TABLE IF NOT EXISTS public.route_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES public.profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    -- Renomear timestamp para created_at se necessário (para padronização)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'route_history' 
        AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE public.route_history RENAME COLUMN timestamp TO created_at;
    END IF;
END $$;

-- 4. POLÍTICAS DE ACESSO REALTIME (RLS)
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Motoboys podem inserir sua própria rota" ON public.route_history;
CREATE POLICY "Motoboys podem inserir sua própria rota" 
ON public.route_history FOR INSERT WITH CHECK (auth.uid() = motoboy_id);

DROP POLICY IF EXISTS "Todos podem ver rotas de seus pedidos" ON public.route_history;
CREATE POLICY "Todos podem ver rotas de seus pedidos" 
ON public.route_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = route_history.order_id 
        AND (orders.customer_id = auth.uid() OR orders.motoboy_id = auth.uid())
    )
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 5. ÍNDICES DE PERFORMANCE (Usando EXECUTE para evitar erro de análise estática)
DO $$ 
BEGIN
    -- Criar índice na coluna oficial 'created_at'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'route_history' 
        AND column_name = 'created_at'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_route_history_order_time ON public.route_history(order_id, created_at DESC)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_motoboy_active ON orders(motoboy_id) 
WHERE status IN ('aceito', 'pronto_entrega', 'retirado', 'em_rota');

-- Rota Polyline e Status atualizados com sucesso.

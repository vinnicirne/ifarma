-- ============================================
-- AUDITORIA SÊNIOR: CORREÇÃO P0/P1 - SEGURANÇA E CONCORRÊNCIA
-- ============================================

-- 1. PROTEÇÃO DE RLS: HISTÓRICO DE ROTAS
-- Garante que motoboy, admin e FARMÁCIA (dona do pedido) vejam as coordenadas
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilidade do histórico de rota" ON public.route_history;
CREATE POLICY "Visibilidade do histórico de rota" 
ON public.route_history FOR SELECT 
USING (
    -- Motoboy vê sua própria rota
    auth.uid() = motoboy_id 
    OR 
    -- Admin vê tudo
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Farmácia dona do pedido vê a rota associada
    EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.pharmacies p ON o.pharmacy_id = p.id
        WHERE o.id = route_history.order_id 
        AND p.owner_id = auth.uid()
    )
);

-- 2. FUNÇÃO SEGURA DE ASSOCIAÇÃO (Alteração de Motoboy)
-- Permite atribuir ou ALTERAR o motoboy/bike, resetando para 'aceito' se não estiver finalizado.
CREATE OR REPLACE FUNCTION assign_order_to_motoboy(p_order_id UUID, p_motoboy_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    SELECT status INTO v_current_status FROM public.orders WHERE id = p_order_id;
    
    -- Só permite atribuir se o pedido não estiver cancelado ou já entregue
    IF v_current_status IN ('cancelado', 'entregue') THEN
        RETURN FALSE;
    END IF;

    UPDATE public.orders 
    SET motoboy_id = p_motoboy_id,
        status = 'aceito', -- Reseta status para o novo motoboy iniciar o fluxo
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 3. LIMPEZA DE TOKENS NO LOGOUT (Segurança P1)
-- Função para invalidar tokens ao sair da conta, evitando notificações cruzadas
CREATE OR REPLACE FUNCTION clean_device_token_on_logout(p_token TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.device_tokens WHERE token = p_token;
END;
$$ LANGUAGE plpgsql;

-- 4. ATUALIZAÇÃO DE CONSTRAINT DE STATUS
-- Adiciona status para cobrir todo o fluxo informado:
-- 'aceito', 'preparando', 'aguardando_retirada', 'retirado', 'em_rota', 'entregue'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',           -- Criado
    'aceito',             -- Aceito pela farmácia/motoboy
    'preparando',         -- Em preparação
    'aguardando_retirada',-- Pronto, esperando motoboy
    'retirado',           -- Motoboy pegou
    'em_rota',            -- A caminho
    'entregue',           -- Finalizado
    'cancelado',          -- Cancelado
    'pronto_entrega'      -- Legado/Alternativo
));

-- 5. ÍNDICES DE PERFORMANCE (Performance P2)
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON order_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_history_timestamp ON route_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_route_history_order_id ON route_history(order_id);

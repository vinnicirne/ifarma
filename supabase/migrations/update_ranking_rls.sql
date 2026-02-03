-- ==============================================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS - SUPORTE A RANKING EM TEMPO REAL E PERMISSÕES
-- ==============================================================================

-- 1. Habilitar Realtime para a tabela order_items
-- Isso permite que mudanças nos itens (embora raras pós-criação) sejam notificadas se necessário,
-- mas principalmente garante consistência com a tabela orders.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
END $$;

-- 2. Garantir que a tabela order_items tenha RLS ativado
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA DE ACESSO PARA ADMIN (CRUCIAL PARA O DASHBOARD DO ADMIN)
-- O Admin deve conseguir ver os itens de TODOS os pedidos para montar o ranking.
DROP POLICY IF EXISTS "Admins podem ver todos os itens" ON order_items;
CREATE POLICY "Admins podem ver todos os itens" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. POLÍTICA DE ACESSO PARA LOJISTAS (CRUCIAL PARA O DASHBOARD DO GESTOR)
-- O Lojista deve ver apenas itens de pedidos ligados à sua farmácia.
DROP POLICY IF EXISTS "Lojistas podem ver itens" ON order_items;
CREATE POLICY "Lojistas podem ver itens" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN pharmacies p ON o.pharmacy_id = p.id
            WHERE o.id = order_items.order_id 
            AND p.owner_id = auth.uid()
        )
    );

-- 5. POLÍTICA DE ACESSO PARA CLIENTES/MOTOBOYS (PARTICIPANTES)
-- Mantém a privacidade: só vê quem fez o pedido ou quem entrega.
DROP POLICY IF EXISTS "Participantes podem ver itens do pedido" ON order_items;
CREATE POLICY "Participantes podem ver itens do pedido" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

-- 6. CRIAR ÍNDICES PARA ALTA PERFORMANCE DO DASHBOARD
-- Acelera o agrupamento e contagem para o Ranking de Produtos.
CREATE INDEX IF NOT EXISTS idx_order_items_product_ranking ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_project_product_quantity ON order_items(product_id, quantity);

-- ==============================================================================
-- FIM DA ATUALIZAÇÃO
-- ==============================================================================

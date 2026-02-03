-- =============================================
-- FIX: PERMISSÕES DE INSERT EM ORDER_ITEMS
-- =============================================

-- Habilita o INSERT para clientes nos itens de seus próprios pedidos
DROP POLICY IF EXISTS "Clientes podem inserir itens de seus pedidos" ON order_items;
CREATE POLICY "Clientes podem inserir itens de seus pedidos" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND customer_id = auth.uid()
        )
    );

-- Garante que Admins também podem gerenciar itens (opcional, mas recomendado)
DROP POLICY IF EXISTS "Admins podem gerenciar itens de pedidos" ON order_items;
CREATE POLICY "Admins podem gerenciar itens de pedidos" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Nota: As políticas de SELECT já existem no schema principal.

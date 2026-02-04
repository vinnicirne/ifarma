-- ===============================================================
-- CORREÇÃO DE PERMISSÕES PARA PEDIDOS (ORDERS)
-- ===============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 1. Permite que usuários vejam seus próprios pedidos
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT
    USING (auth.uid() = customer_id);

-- 2. Permite que usuários criem pedidos
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- 3. Permite que farmácias vejam pedidos direcionados a elas
-- (Assumindo que o usuário logado é o dono da farmácia ou staff)
DROP POLICY IF EXISTS "Pharmacies can view assigned orders" ON orders;
CREATE POLICY "Pharmacies can view assigned orders" ON orders
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT owner_id FROM pharmacies WHERE id = orders.pharmacy_id
        ) OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'motoboy')
    );

-- 4. Permite atualização de status (Farmácias e Motoboys)
DROP POLICY IF EXISTS "Pharmacies/Motoboys can update orders" ON orders;
CREATE POLICY "Pharmacies/Motoboys can update orders" ON orders
    FOR UPDATE
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id) OR
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'motoboy')
    );

-- ===============================================================
-- PERMISSÕES PARA ITENS DO PEDIDO
-- ===============================================================

DROP POLICY IF EXISTS "View Order Items" ON order_items;
CREATE POLICY "View Order Items" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (
                orders.customer_id = auth.uid() OR
                auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = orders.pharmacy_id) OR
                (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'motoboy')
            )
        )
    );

DROP POLICY IF EXISTS "Create Order Items" ON order_items;
CREATE POLICY "Create Order Items" ON order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

-- ============================================
-- CORREÇÃO DEFINITIVA: RLS para Gestores (Merchants)
-- ============================================

-- --------------------------------------------
-- 1. TABELA DE PRODUTOS (Products)
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON products;
DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON products;
DROP POLICY IF EXISTS "Gestores podem gerenciar seus próprios produtos" ON products;
DROP POLICY IF EXISTS "Admins: Gestão Total de Produtos" ON products;
DROP POLICY IF EXISTS "Gestores: Gestão de Produtos da Loja" ON products;

-- Admin: Acesso Total
CREATE POLICY "Admins: Gestão Total de Produtos" ON products
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Gestor: Acesso apenas à sua farmácia
CREATE POLICY "Gestores: Gestão de Produtos da Loja" ON products
    FOR ALL USING (
        pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant')
    )
    WITH CHECK (
        pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant')
    );

-- Público: Ver produtos ativos
DROP POLICY IF EXISTS "Todos podem ver produtos" ON products;
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON products;
DROP POLICY IF EXISTS "Público: Ver Produtos" ON products;
CREATE POLICY "Público: Ver Produtos" ON products FOR SELECT USING (true);


-- --------------------------------------------
-- 2. TABELA DE PEDIDOS (Orders)
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins veem todos pedidos" ON orders;
DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON orders;
DROP POLICY IF EXISTS "Gestores: Ver Pedidos da Loja" ON orders;
DROP POLICY IF EXISTS "Gestores: Atualizar Pedidos da Loja" ON orders;
DROP POLICY IF EXISTS "Admins: Gestão Total de Pedidos" ON orders;

-- Admin: Acesso Total
CREATE POLICY "Admins: Gestão Total de Pedidos" ON orders
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Gestor: Ver e Atualizar pedidos da sua loja
CREATE POLICY "Gestores: Ver Pedidos da Loja" ON orders
    FOR SELECT USING (
        pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant')
    );

CREATE POLICY "Gestores: Atualizar Pedidos da Loja" ON orders
    FOR UPDATE USING (
        pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant')
    );


-- --------------------------------------------
-- 3. TABELA DE ITENS DE PEDIDO (Order Items)
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins veem todos itens" ON order_items;
DROP POLICY IF EXISTS "Lojistas podem ver itens" ON order_items;
DROP POLICY IF EXISTS "Gestores: Ver Itens da Loja" ON order_items;
DROP POLICY IF EXISTS "Admins: Gestão Total de Itens" ON order_items;

-- Admin: Acesso Total
CREATE POLICY "Admins: Gestão Total de Itens" ON order_items
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Gestor: Ver itens dos pedidos da sua loja
CREATE POLICY "Gestores: Ver Itens da Loja" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON o.pharmacy_id = p.pharmacy_id
            WHERE o.id = order_items.order_id 
            AND p.id = auth.uid() 
            AND p.role = 'merchant'
        )
    );

-- --------------------------------------------
-- 4. REABILITAR RLS EM TUDO
-- --------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

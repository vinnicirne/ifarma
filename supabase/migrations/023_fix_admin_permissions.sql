-- ==============================================================================
-- CORREÇÃO TOTAL DE PERMISSÕES DE ADMIN (IFARMA)
-- Data: 29/01/2026
-- Descrição: Garante que Admins possam ler TODAS as tabelas relacionadas a pedidos.
-- ==============================================================================

-- 1. ORDERS (Já aplicado, mas reforçando)
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;
CREATE POLICY "Admins podem ver todos os pedidos" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. ORDER_ITEMS (CRÍTICO: Faltava essa permissão!)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver todos os itens" ON order_items;
CREATE POLICY "Admins podem ver todos os itens" ON order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. ORDER_MESSAGES (Chat)
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver todas as mensagens" ON order_messages;
CREATE POLICY "Admins podem ver todas as mensagens" ON order_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. DELIVERY_RATINGS (Avaliações)
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver todas as avaliações" ON delivery_ratings;
CREATE POLICY "Admins podem ver todas as avaliações" ON delivery_ratings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. VERIFICAÇÃO DE PROFILES (Geralmente já existe, mas garantindo)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins podem ver todos os perfis') THEN
        CREATE POLICY "Admins podem ver todos os perfis" ON profiles
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;

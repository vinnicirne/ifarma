-- ============================================
-- SOLUÇÃO: Acesso Bloqueado - Recuperação
-- Email: viniciuscirne@gmail.com
-- ============================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE route_history DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR SEU PERFIL ADMIN
SELECT id, email, role, is_active 
FROM profiles 
WHERE email = 'viniciuscirne@gmail.com';

-- 3. GARANTIR QUE VOCÊ É ADMIN
UPDATE profiles 
SET role = 'admin', is_active = true 
WHERE email = 'viniciuscirne@gmail.com';

-- 4. RECRIAR POLÍTICAS RLS CORRETAS
-- Limpar políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;

-- Criar políticas corretas
CREATE POLICY "Usuários podem ver próprio perfil" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins podem ver todos os perfis" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins podem inserir perfis" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins podem atualizar qualquer perfil" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Usuários podem atualizar próprio perfil" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 5. POLÍTICAS PARA OUTRAS TABELAS
-- Pharmacies
DROP POLICY IF EXISTS "Admins podem gerenciar farmácias" ON pharmacies;
CREATE POLICY "Admins podem gerenciar farmácias" ON pharmacies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Todos podem ver farmácias" ON pharmacies
    FOR SELECT USING (true);

-- Products
DROP POLICY IF EXISTS "Todos podem ver produtos" ON products;
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON products;

CREATE POLICY "Todos podem ver produtos" ON products
    FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar produtos" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Orders
DROP POLICY IF EXISTS "Usuários veem próprios pedidos" ON orders;
DROP POLICY IF EXISTS "Admins veem todos pedidos" ON orders;

CREATE POLICY "Usuários veem próprios pedidos" ON orders
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins veem todos pedidos" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order Items
DROP POLICY IF EXISTS "Usuários veem itens próprios" ON order_items;
DROP POLICY IF EXISTS "Admins veem todos itens" ON order_items;

CREATE POLICY "Usuários veem itens próprios" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins veem todos itens" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. REABILITAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;

-- 7. VERIFICAÇÃO FINAL
SELECT 
    'Perfil Admin' as tipo,
    id, 
    email, 
    role, 
    is_active 
FROM profiles 
WHERE email = 'viniciuscirne@gmail.com';

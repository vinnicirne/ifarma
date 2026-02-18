-- ============================================
-- RESTAURAR RLS POLICIES (VERSÃO SIMPLES E FUNCIONAL)
-- Restaura as policies essenciais sem erros de sintaxe
-- ============================================

-- 🚨 PROBLEMA: O FIX_RLS_SIMPLES.sql removeu policies importantes

-- ✅ RESTAURAÇÃO: Recriar apenas as policies essenciais

-- ============================================
-- POLÍTICAS RLS - PROFILES (ESSENCIAIS)
-- ============================================

-- Policy para ver próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy para atualizar próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy para admins verem todos os perfis (IMPORTANTE)
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy para merchants gerenciarem equipe
DROP POLICY IF EXISTS "Lojistas podem gerenciar equipe" ON profiles;
CREATE POLICY "Lojistas podem gerenciar equipe" ON profiles
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- Policy para ver equipe da mesma farmácia
DROP POLICY IF EXISTS "Usuários podem ver equipe" ON profiles;
CREATE POLICY "Usuários podem ver equipe" ON profiles
    FOR SELECT USING (
        auth.uid() = id
        OR 
        (
            pharmacy_id IS NOT NULL AND
            pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

-- ============================================
-- POLÍTICAS RLS - PHARMACIES
-- ============================================

-- Policy para todos verem farmácias aprovadas
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;
CREATE POLICY "Todos podem ver farmácias aprovadas" ON pharmacies
    FOR SELECT USING (status = 'Aprovado' OR owner_id = auth.uid());

-- Policy para lojistas atualizarem sua farmácia
DROP POLICY IF EXISTS "Lojistas podem atualizar sua farmácia" ON pharmacies;
CREATE POLICY "Lojistas podem atualizar sua farmácia" ON pharmacies
    FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - PRODUCTS
-- ============================================

-- Policy para todos verem produtos ativos
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON products;
CREATE POLICY "Todos podem ver produtos ativos" ON products
    FOR SELECT USING (is_active = true);

-- Policy para lojistas gerenciarem produtos
DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON products;
CREATE POLICY "Lojistas podem gerenciar produtos" ON products
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS RLS - ORDERS
-- ============================================

-- Policy para clientes verem seus pedidos
DROP POLICY IF EXISTS "Clientes podem ver seus pedidos" ON orders;
CREATE POLICY "Clientes podem ver seus pedidos" ON orders
    FOR SELECT USING (customer_id = auth.uid());

-- Policy para lojistas verem pedidos da sua farmácia
DROP POLICY IF EXISTS "Lojistas podem ver pedidos da farmácia" ON orders;
CREATE POLICY "Lojistas podem ver pedidos da farmácia" ON orders
    FOR SELECT USING (pharmacy_id IN (
        SELECT id FROM pharmacies WHERE owner_id = auth.uid()
    ));

-- Policy para lojistas atualizarem pedidos da sua farmácia
DROP POLICY IF EXISTS "Lojistas podem atualizar pedidos da farmácia" ON orders;
CREATE POLICY "Lojistas podem atualizar pedidos da farmácia" ON orders
    FOR UPDATE USING (pharmacy_id IN (
        SELECT id FROM pharmacies WHERE owner_id = auth.uid()
    ));

-- Policy para motoboys verem pedidos atribuídos a eles
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON orders;
CREATE POLICY "Motoboys podem ver pedidos atribuídos" ON orders
    FOR SELECT USING (motoboy_id = auth.uid());

-- Policy para motoboys atualizarem status dos pedidos
DROP POLICY IF EXISTS "Motoboys podem atualizar status dos pedidos" ON orders;
CREATE POLICY "Motoboys podem atualizar status dos pedidos" ON orders
    FOR UPDATE USING (motoboy_id = auth.uid());

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT 
    '✅ RLS Policies essenciais restauradas com sucesso!' as resultado,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('profiles', 'pharmacies', 'products', 'orders')) as total_policies;

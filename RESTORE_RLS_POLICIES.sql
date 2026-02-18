-- ============================================
-- RESTAURAR RLS POLICIES ORIGINAIS
-- Restaura as policies que foram removidas pelo FIX_RLS_SIMPLES.sql
-- ============================================

-- 🚨 PROBLEMA: O FIX_RLS_SIMPLES.sql removeu policies importantes

-- ✅ RESTAURAÇÃO: Recriar todas as policies originais do schema

-- ============================================
-- POLÍTICAS RLS - PROFILES (RESTAURAÇÃO COMPLETA)
-- ============================================

-- Policy para ver próprio perfil (já existe, mas vamos garantir)
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy para atualizar próprio perfil (já existe, mas vamos garantir)
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy para admins verem todos os perfis (IMPORTANTE - foi removida)
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy para merchants gerenciarem equipe (NOVA - necessária)
DROP POLICY IF EXISTS "Lojistas podem gerenciar equipe" ON profiles;
CREATE POLICY "Lojistas podem gerenciar equipe" ON profiles
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- Policy para gerentes verem equipe (NOVA - necessária)
DROP POLICY IF EXISTS "Gerentes podem ver equipe da farmácia" ON profiles;
CREATE POLICY "Gerentes podem ver equipe da farmácia" ON profiles
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT pharmacy_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('merchant', 'manager')
        )
    );

-- Policy para gerentes atualizarem equipe (NOVA - necessária)
DROP POLICY IF EXISTS "Gerentes podem atualizar equipe" ON profiles;
CREATE POLICY "Gerentes podem atualizar equipe" ON profiles
    FOR UPDATE USING (
        pharmacy_id IN (
            SELECT pharmacy_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('merchant', 'manager')
        )
    ) 
    AND (
        auth.uid() = id 
        OR 
        (role != 'merchant' AND role != 'admin')
    );

-- Policy adicional para ver equipe básica (MANTIDA do SQL anterior)
DROP POLICY IF EXISTS "Usuários podem ver equipe básica" ON profiles;
CREATE POLICY "Usuários podem ver equipe básica" ON profiles
    FOR SELECT USING (
        auth.uid() = id
        OR
        (
            pharmacy_id IS NOT NULL AND
            pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

-- ============================================
-- POLÍTICAS RLS - PHARMACIES (RESTAURAÇÃO)
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
-- POLÍTICAS RLS - PRODUCTS (RESTAURAÇÃO)
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
-- POLÍTICAS RLS - ORDERS (RESTAURAÇÃO)
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
DROP POLICY IF EXISTS "Lojistas podem atualizar pedidos da sua farmácia" ON orders;
CREATE POLICY "Lojistas podem atualizar pedidos da sua farmácia" ON orders
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

-- Verificar se RLS está ativo
SELECT 
    'RLS Status' as tabela,
    row_level_security as rls_ativo
FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- Verificar todas as policies criadas
SELECT 
    'Total de Policies' as info,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('profiles', 'pharmacies', 'products', 'orders');

-- Listar todas as policies da tabela profiles
SELECT 
    'Policies da tabela profiles' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

SELECT 
    '✅ RLS Policies restauradas com sucesso!' as resultado;

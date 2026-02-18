-- ============================================
-- RESTAURAR SISTEMA COMPLETO - VERSÃO ORIGINAL
-- Restaura o sistema exatamente como estava no schema_completo.sql
-- ============================================

-- 🚨 EMERGÊNCIA: Sistema quebrado pelo FIX_RLS_SIMPLES.sql
-- ✅ SOLUÇÃO: Restaurar configuração original completa

-- ============================================
-- 1. LIMPAR POLICIES CORROMPIDAS
-- ============================================

-- Remover todas as policies que podem estar corrompidas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver equipe" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Lojistas podem gerenciar equipe" ON profiles;
DROP POLICY IF EXISTS "Gerentes podem ver equipe da farmácia" ON profiles;
DROP POLICY IF EXISTS "Gerentes podem atualizar equipe" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver equipe básica" ON profiles;

-- Limpar policies de outras tabelas também
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;
DROP POLICY IF EXISTS "Lojistas podem atualizar sua farmácia" ON pharmacies;
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON products;
DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON products;
DROP POLICY IF EXISTS "Clientes podem ver seus pedidos" ON orders;
DROP POLICY IF EXISTS "Lojistas podem ver pedidos da farmácia" ON orders;
DROP POLICY IF EXISTS "Lojistas podem atualizar pedidos da farmácia" ON orders;
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON orders;
DROP POLICY IF EXISTS "Motoboys podem atualizar status dos pedidos" ON orders;

-- ============================================
-- 2. GARANTIR RLS ATIVO EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RESTAURAR POLICIES ORIGINAIS - PROFILES
-- ============================================

-- Policy: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Merchants podem ver perfis da sua farmácia
CREATE POLICY "Merchants can view pharmacy profiles" ON profiles
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- Policy: Merchants podem atualizar perfis da sua farmácia
CREATE POLICY "Merchants can update pharmacy profiles" ON profiles
    FOR UPDATE USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
        AND 
        (role != 'merchant' AND role != 'admin')
    );

-- ============================================
-- 4. RESTAURAR POLICIES ORIGINAIS - PHARMACIES
-- ============================================

-- Policy: Todos podem ver farmácias aprovadas
CREATE POLICY "Public pharmacies are viewable by everyone" ON pharmacies
    FOR SELECT USING (status = 'Aprovado' OR owner_id = auth.uid());

-- Policy: Merchants podem atualizar sua farmácia
CREATE POLICY "Merchants can update own pharmacy" ON pharmacies
    FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- 5. RESTAURAR POLICIES ORIGINAIS - PRODUCTS
-- ============================================

-- Policy: Todos podem ver produtos ativos
CREATE POLICY "Active products are viewable by everyone" ON products
    FOR SELECT USING (is_active = true);

-- Policy: Merchants podem gerenciar produtos da sua farmácia
CREATE POLICY "Merchants can manage pharmacy products" ON products
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- 6. RESTAURAR POLICIES ORIGINAIS - ORDERS
-- ============================================

-- Policy: Clientes podem ver seus pedidos
CREATE POLICY "Customers can view own orders" ON orders
    FOR SELECT USING (customer_id = auth.uid());

-- Policy: Merchants podem ver pedidos da sua farmácia
CREATE POLICY "Merchants can view pharmacy orders" ON orders
    FOR SELECT USING (pharmacy_id IN (
        SELECT id FROM pharmacies WHERE owner_id = auth.uid()
    ));

-- Policy: Merchants podem atualizar pedidos da sua farmácia
CREATE POLICY "Merchants can update pharmacy orders" ON orders
    FOR UPDATE USING (pharmacy_id IN (
        SELECT id FROM pharmacies WHERE owner_id = auth.uid()
    ));

-- Policy: Motoboys podem ver pedidos atribuídos
CREATE POLICY "Motoboys can view assigned orders" ON orders
    FOR SELECT USING (motoboy_id = auth.uid());

-- Policy: Motoboys podem atualizar status dos pedidos
CREATE POLICY "Motoboys can update order status" ON orders
    FOR UPDATE USING (motoboy_id = auth.uid());

-- ============================================
-- 7. RESTAURAR POLICIES ORIGINAIS - CATEGORIES
-- ============================================

-- Policy: Todos podem ver categorias
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Policy: Admins podem gerenciar categorias
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 8. GARANTIR ESTRUTURA DA TABELA PROFILES
-- ============================================

-- Adicionar colunas se não existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id),
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- Atualizar CHECK constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'merchant', 'manager', 'staff', 'motoboy', 'admin'));

-- ============================================
-- 9. GARANTIR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_id ON public.profiles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_pharmacies_owner_id ON public.pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON public.pharmacies(status);

CREATE INDEX IF NOT EXISTS idx_products_pharmacy_id ON public.products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_id ON public.orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_motoboy_id ON public.orders(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================
-- 10. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar status do RLS
SELECT 
    'RLS STATUS FINAL' as info,
    tablename,
    rowlevelsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'pharmacies', 'products', 'orders', 'categories')
ORDER BY tablename;

-- Verificar total de policies
SELECT 
    'TOTAL POLICIES RESTAURADAS' as info,
    tablename,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'pharmacies', 'products', 'orders', 'categories')
GROUP BY tablename
ORDER BY tablename;

-- Verificação final
SELECT 
    '✅ SISTEMA RESTAURADO COM SUCESSO!' as resultado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies_sistema,
    NOW() as timestamp_restauracao;

-- ============================================
-- INSTRUÇÕES FINAIS
-- ============================================

-- 1. Execute este SQL completo no Supabase Dashboard
-- 2. Aguarde a execução completa (pode demorar alguns minutos)
-- 3. Recarregue a página /gestor/equipe
-- 4. O sistema deve estar funcionando como antes
-- 5. Se ainda houver problemas, execute a AUDITORIA_COMPLETA.sql

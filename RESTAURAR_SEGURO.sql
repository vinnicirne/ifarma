-- ============================================
-- RESTAURAR SEGURO - VERSÃO INTELIGENTE
-- Só recria o que realmente precisa, sem erros
-- ============================================

-- 🚨 EMERGÊNCIA: Sistema quebrado pelo FIX_RLS_SIMPLES.sql
-- ✅ SOLUÇÃO: Restauração inteligente e segura

-- ============================================
-- 1. VERIFICAR O QUE JÁ EXISTE E SÓ RECREAR O NECESSÁRIO
-- ============================================

-- Primeiro, vamos ver o que já existe
SELECT 
    'POLICIES EXISTENTES ANTES DA RESTAURAÇÃO' as info,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 2. LIMPAR APENAS POLICIES PROBLEMÁTICAS
-- ============================================

-- Remover apenas policies que podem estar causando problemas
-- (Se já existirem as boas, não remove)

DROP POLICY IF EXISTS "Usuários podem ver equipe" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar perfil" ON profiles;
DROP POLICY IF EXISTS "Lojistas podem gerenciar equipe" ON profiles;
DROP POLICY IF EXISTS "Gerentes podem ver equipe da farmácia" ON profiles;
DROP POLICY IF EXISTS "Gerentes podem atualizar equipe" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver equipe básica" ON profiles;

-- ============================================
-- 3. GARANTIR RLS ATIVO
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RECREATE APENAS POLICIES ESSENCIAIS FALTANTES
-- ============================================

-- Policy: Usuários podem ver seu próprio perfil (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
        RAISE NOTICE 'Policy "Users can view own profile" criada';
    ELSE
        RAISE NOTICE 'Policy "Users can view own profile" já existe';
    END IF;
END $$;

-- Policy: Usuários podem atualizar seu próprio perfil (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
        RAISE NOTICE 'Policy "Users can update own profile" criada';
    ELSE
        RAISE NOTICE 'Policy "Users can update own profile" já existe';
    END IF;
END $$;

-- Policy: Admins podem ver todos os perfis (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
        RAISE NOTICE 'Policy "Admins can view all profiles" criada';
    ELSE
        RAISE NOTICE 'Policy "Admins can view all profiles" já existe';
    END IF;
END $$;

-- Policy: Merchants podem ver perfis da sua farmácia (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Merchants can view pharmacy profiles'
    ) THEN
        CREATE POLICY "Merchants can view pharmacy profiles" ON profiles
            FOR SELECT USING (
                pharmacy_id IN (
                    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
                )
            );
        RAISE NOTICE 'Policy "Merchants can view pharmacy profiles" criada';
    ELSE
        RAISE NOTICE 'Policy "Merchants can view pharmacy profiles" já existe';
    END IF;
END $$;

-- Policy: Merchants podem atualizar staff (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Merchants can update staff profiles'
    ) THEN
        CREATE POLICY "Merchants can update staff profiles" ON profiles
            FOR UPDATE USING (
                pharmacy_id IN (
                    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
                )
                AND role IN ('manager', 'staff', 'motoboy')
            );
        RAISE NOTICE 'Policy "Merchants can update staff profiles" criada';
    ELSE
        RAISE NOTICE 'Policy "Merchants can update staff profiles" já existe';
    END IF;
END $$;

-- ============================================
-- 5. VERIFICAR E RECREATE POLICIES DE OUTRAS TABELAS (SE NECESSÁRIO)
-- ============================================

-- Pharmacies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pharmacies' 
        AND policyname = 'Public pharmacies are viewable by everyone'
    ) THEN
        CREATE POLICY "Public pharmacies are viewable by everyone" ON pharmacies
            FOR SELECT USING (status = 'Aprovado' OR owner_id = auth.uid());
        RAISE NOTICE 'Policy pharmacies criada';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pharmacies' 
        AND policyname = 'Merchants can update own pharmacy'
    ) THEN
        CREATE POLICY "Merchants can update own pharmacy" ON pharmacies
            FOR UPDATE USING (owner_id = auth.uid());
        RAISE NOTICE 'Policy update pharmacy criada';
    END IF;
END $$;

-- Products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Active products are viewable by everyone'
    ) THEN
        CREATE POLICY "Active products are viewable by everyone" ON products
            FOR SELECT USING (is_active = true);
        RAISE NOTICE 'Policy products criada';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Merchants can manage pharmacy products'
    ) THEN
        CREATE POLICY "Merchants can manage pharmacy products" ON products
            FOR ALL USING (
                pharmacy_id IN (
                    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
                )
            );
        RAISE NOTICE 'Policy manage products criada';
    END IF;
END $$;

-- ============================================
-- 6. GARANTIR ESTRUTURA DA TABELA PROFILES
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
-- 7. GARANTIR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_id ON public.profiles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================

SELECT 
    '✅ RESTAURAÇÃO SEGURA CONCLUÍDA!' as resultado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    NOW() as timestamp;

SELECT 
    'POLICIES FINAIS POR TABELA' as info,
    tablename,
    COUNT(*) as total_policies,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

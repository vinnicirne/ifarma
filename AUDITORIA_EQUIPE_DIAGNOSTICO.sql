-- ============================================
-- AUDITORIA COMPLETA - GESTÃO DE EQUIPE
-- Problemas Identificados e Correções Necessárias
-- ============================================

-- 🚨 PROBLEMA 1: CAMPOS FALTANTES NA TABELA PROFILES
-- O código tenta acessar campos que não existem no schema atual

-- Campos que o frontend usa mas não existem na tabela:
-- pharmacy_id (usado para filtrar membros da equipe)
-- vehicle_plate (para motoboys)
-- vehicle_model (para motoboys)

-- CORREÇÃO 1: Adicionar campos faltantes à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id),
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- Atualizar CHECK constraint para incluir novos roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'merchant', 'manager', 'staff', 'motoboy', 'admin'));

-- 🚨 PROBLEMA 2: RLS POLICIES INSUFICIENTES PARA GESTÃO DE EQUIPE
-- Não existem policies para permitir que merchants/managers vejam e editem sua equipe

-- CORREÇÃO 2: Adicionar policies para gestão de equipe
DROP POLICY IF EXISTS "Lojistas podem gerenciar equipe" ON profiles;
CREATE POLICY "Lojistas podem gerenciar equipe" ON profiles
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Gerentes podem ver equipe da farmácia" ON profiles;
CREATE POLICY "Gerentes podem ver equipe da farmácia" ON profiles
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT pharmacy_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('merchant', 'manager')
        )
    );

DROP POLICY IF EXISTS "Gerentes podem atualizar equipe" ON profiles;
CREATE POLICY "Gerentes podem atualizar equipe" ON profiles
    FOR UPDATE USING (
        pharmacy_id IN (
            SELECT pharmacy_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('merchant', 'manager')
        )
    ) AND NOT (role = 'merchant' OR role = 'admin'); -- Não permitir alterar donos/admins

-- 🚨 PROBLEMA 3: ÍNDICES FALTANTES PARA PERFORMANCE
-- Consultas por pharmacy_id e role podem ser lentas sem índices

-- CORREÇÃO 3: Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_id ON public.profiles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_role ON public.profiles(pharmacy_id, role);

-- 🚨 PROBLEMA 4: TRIGGER UPDATED_AT FALTANDO
-- Schema não menciona trigger para profiles

-- CORREÇÃO 4: Adicionar trigger updated_at (se não existir)
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🚨 PROBLEMA 5: EDGE FUNCTIONS DEPENDÊNCIAS
-- As funções delete-user-admin e create-user-admin devem existir e estar funcionando

-- Verificar se as Edge Functions existem:
-- SELECT * FROM pg_catalog.pg_proc WHERE proname LIKE '%user%';

-- 🚨 PROBLEMA 6: DADOS INCONSISTENTES
-- Membros podem ter pharmacy_id NULL quando deveriam ter

-- CORREÇÃO 6: Atualizar dados inconsistentes (opcional)
-- UPDATE public.profiles 
-- SET pharmacy_id = (
--     SELECT p.id FROM pharmacies p 
--     WHERE p.owner_id = (
--         SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1
--     )
-- )
-- WHERE role IN ('manager', 'staff', 'motoboy') AND pharmacy_id IS NULL;

-- 🚨 PROBLEMA 7: RLS POLICIES PARA VER PRÓPRIO PERFIL COM MAIS CAMPOS
-- Usuários precisam ver seu próprio pharmacy_id

-- CORREÇÃO 7: Atualizar policy para ver próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 🚨 PROBLEMA 8: PERMISSÃO PARA VER EQUIPE SEM PHARMACY_ID
-- Se não tiver pharmacy_id, deve pelo menos ver a si mesmo

-- CORREÇÃO 8: Policy adicional para fallback
DROP POLICY IF EXISTS "Usuários podem ver equipe básica" ON profiles;
CREATE POLICY "Usuários podem ver equipe básica" ON profiles
    FOR SELECT USING (
        -- Permitir ver próprio perfil
        auth.uid() = id
        OR
        -- Permitir ver membros da mesma farmácia (se tiver pharmacy_id)
        (
            pharmacy_id IS NOT NULL AND
            pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

SELECT '✅ Auditoria da tabela profiles concluída - Correções aplicadas' as resultado;

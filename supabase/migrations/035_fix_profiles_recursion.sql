-- ============================================
-- FIX: RECURSÃO DE RLS EM PERFIS (ERRO 500)
-- DATA: 2026-02-01
-- ============================================

-- 1. Resetar políticas de Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can all on profiles" ON profiles;

-- 2. Política de LEITURA (Evita recursão)
-- Simples: Todos podem ler todos. Não faz check de 'admin' aqui.
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 3. Políticas de ESCRITA (Admin pode tudo, Usuário pode o seu)

-- Update Próprio
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Admin INSERT/UPDATE/DELETE (Separado para não afetar SELECT)
-- O check de admin faz um SELECT na tabela profiles.
-- Como a política de SELECT acima é "TRUE" e não checa nada, não entra em loop.
CREATE POLICY "Admins insert profiles" 
ON profiles FOR INSERT 
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins update profiles" 
ON profiles FOR UPDATE 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins delete profiles" 
ON profiles FOR DELETE 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Correção SYSTEM SETTINGS (Erro 403)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read system settings" ON system_settings;
-- Permitir leitura pública para configurações globais
CREATE POLICY "Read system settings" 
ON system_settings FOR SELECT 
USING (true);

DO $$
BEGIN
    RAISE NOTICE 'Políticas de segurança corrigidas (Recursão Removida).';
END $$;

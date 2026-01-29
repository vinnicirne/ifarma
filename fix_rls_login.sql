-- ============================================
-- CORREÇÃO DO ERRO DE LOGIN - "Failed to fetch"
-- Data: 2026-01-27
-- Problema: Dependência circular nas políticas RLS
-- ============================================

-- PASSO 1: Remover políticas problemáticas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;

-- PASSO 2: Criar novas políticas sem dependência circular

-- ✅ Permite que usuários autenticados vejam QUALQUER perfil
-- Isso resolve o problema de dependência circular durante o login
CREATE POLICY "Authenticated users can view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ✅ Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- PASSO 3: Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- PASSO 4: Testar acesso à tabela profiles
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email = 'viniciuscirne@gmail.com';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Após executar este script:
-- 1. Login deve funcionar sem erro "Failed to fetch"
-- 2. Usuários autenticados podem ver perfis (necessário para o app)
-- 3. Apenas o próprio usuário pode atualizar seu perfil (segurança mantida)
-- ============================================

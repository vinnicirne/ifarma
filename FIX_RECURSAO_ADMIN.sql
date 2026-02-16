-- ========================================================
-- FIX: RECURSÃO INFINITA NA POLÍTICA DE PERFIS
-- Este script remove o erro 42P17 e restaura o acesso Admin
-- ========================================================

BEGIN;

-- 1. Criar funções auxiliares que ignoram o RLS (SECURITY DEFINER)
-- Isso evita a recursão porque a função roda como 'postgres'
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Limpar todas as políticas problemáticas de perfis
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON profiles;
DROP POLICY IF EXISTS "User view own profile" on profiles;

-- 3. Recriar políticas SEGURAS (sem recursão)
CREATE POLICY "Acesso básico ao perfil" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR public.check_is_admin()
    );

CREATE POLICY "Edição básica do perfil" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.check_is_admin()
    );

-- 4. Garantir que você é ADMIN (Troque vinnicirne@gmail.com pelo seu e-mail se necessário)
-- Primeiro tentamos encontrar pelo e-mail
UPDATE public.profiles SET role = 'admin' WHERE email = 'vinnicirne@gmail.com';

-- 5. Se você estiver logado com outro e-mail, promova o atual (usando auth.uid())
-- Descomente a linha abaixo se logar e ainda não for admin
-- UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();

COMMIT;

-- Diagnóstico final
SELECT id, email, role FROM public.profiles WHERE email = 'vinnicirne@gmail.com';

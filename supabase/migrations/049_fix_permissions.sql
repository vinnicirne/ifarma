-- Função auxiliar para verificar se é admin sem causar recursão
-- SECURITY DEFINER garante que a função execute com permissões de superusuário (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Tabela PROFILES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer usuário autenticado leia seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Permitir que usuários atualizem seus próprios perfis
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Permissões ADICIONAIS para ADMIN (usando a função is_admin() para evitar recursão)
-- Admin pode VER tudo
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin pode INSERIR novos perfis (ex: criar usuários)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admin pode ATUALIZAR tudo
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin pode DELETAR tudo
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin());


-- 2. Garantir permissões em OUTRAS tabelas críticas que podem estar bloqueando

-- Tabela PHARMACIES
ALTER TABLE IF EXISTS public.pharmacies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full access pharmacies" ON public.pharmacies;
CREATE POLICY "Admins full access pharmacies"
ON public.pharmacies FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tabela DELIVERIES / ORDERS
-- Assumindo que a tabela se chame 'orders' ou 'deliveries' (verifiquei logs e parece ser 'orders' em contextos anteriores, mas vou garantir policies genéricas se possível. 
-- Como não tenho certeza do nome exato agora, vou focar no que sei, mas o is_admin() resolve para qualquer tabela que use a checagem antiga)

-- Se houver tabelas usando a checagem antiga (subselect), elas podem falhar se profiles estiver bloqueado.
-- Mas com a correção acima em profiles (Users can view own profile), os subselects antigos voltam a funcionar pois o usuário admin consegue ler seu próprio role!

-- Então a correção crítica é liberar o SELECT no próprio perfil em 'profiles'.

-- ============================================
-- FIX 42P17: infinite recursion detected in policy for relation "profiles"
-- Alvo: tabela public.profiles
-- Estratégia: remover policy recursiva e recriar policies usando função SECURITY DEFINER
-- ============================================

-- 0) Coloque em modo "seguro" para conseguir aplicar as mudanças
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 1) Remover policies recursivas/problemáticas (não mexe em outras tabelas)
DROP POLICY IF EXISTS "Usuários podem ver equipe" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver equipe básica" ON public.profiles;

DROP POLICY IF EXISTS "Ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Ver equipe mesma farmácia" ON public.profiles;
DROP POLICY IF EXISTS "Atualizar próprio perfil" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Merchants can view pharmacy profiles" ON public.profiles;
DROP POLICY IF EXISTS "Merchants can update pharmacy profiles" ON public.profiles;
DROP POLICY IF EXISTS "Merchants can update staff profiles" ON public.profiles;

-- 2) Função auxiliar SEM recursão (SECURITY DEFINER)
-- Importante: fixar search_path por segurança
CREATE OR REPLACE FUNCTION public.user_pharmacy_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pharmacy_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 3) Reabilitar RLS antes de criar policies (boa prática)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4) Policies novas (sem subselect em profiles dentro da policy)
-- 4.1) SELECT: ver próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4.2) SELECT: ver equipe da mesma farmácia
-- Observação: isso permite ler qualquer role na mesma farmácia; se quiser restringir roles, dá pra adicionar AND role IN (...)
CREATE POLICY "profiles_select_same_pharmacy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  pharmacy_id IS NOT NULL
  AND pharmacy_id = public.user_pharmacy_id()
);

-- 4.3) UPDATE: atualizar próprio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 5) Validações (rode e confira os resultados)
-- ============================================

-- Policies ativas em profiles
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Ver se RLS está ativo
SELECT tablename, rowlevelsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

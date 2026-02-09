-- ==============================================================================
-- AUDITORIA E CORREÇÃO TOTAL DE RLS (ADMIN + RECURSÃO)
-- ==============================================================================

-- 1. CORREÇÃO DA FUNÇÃO BASE (CRÍTICO)
-- A função precisa ser SECURITY DEFINER para ignorar RLS ao consultar profiles
-- E deve definir explicitamente o search_path por segurança
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypassar RLS na leitura da tabela profiles
SET search_path = public -- Previne search_path hijacking
AS $$
DECLARE
  current_role text;
BEGIN
  -- Consulta direta blindada
  SELECT role INTO current_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN current_role = 'admin';
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro (ex: tabela não existe, erro de permissão bizarro), nega acesso por segurança
  RETURN false;
END;
$$;

-- Garante que o Postgres (superuser) seja o dono, para garantir o bypass do RLS
ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- 2. CORREÇÃO DA TABELA PROFILES (A RAIZ DA RECURSÃO)
-- Se profiles bloquear a leitura do próprio usuário, is_admin falha.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política BASE: Usuário lê a si mesmo (SEM usar is_admin para evitar loop)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Agora sim, políticas de Admin na profiles (seguras pois a leitura básica está garantida acima)
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. ITERAÇÃO SOBRE TODAS AS OUTRAS TABELAS PÚBLICAS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'profiles' -- Já tratamos profiles manualmente acima
    LOOP
        -- Log
        RAISE NOTICE 'Auditando tabela: %', t;

        -- Habilita RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

        -- Remove políticas antigas de admin que podem estar quebradas
        EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins full access %s" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I;', t);
        
        -- Aplica NOVA política padronizada usando a is_admin() corrigida
        EXECUTE format('
            CREATE POLICY "Admins full access %s" ON public.%I
            FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
        ', t, t);
        
        RAISE NOTICE '  -> Política Admin aplicada com sucesso em %', t;
    END LOOP;
END $$;

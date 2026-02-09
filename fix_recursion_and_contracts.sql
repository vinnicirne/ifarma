-- FIX FINAL: Evitar recursão infinita e garantir acesso

-- 1. Recriar a função is_admin de forma blindada contra recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_flag boolean;
BEGIN
  -- Tenta pegar do profiles, mas como SECURITY DEFINER (bypassing RLS)
  -- Importante: O owner da função deve ser superusuário/postgres para que SECURITY DEFINER funcione
  SELECT (role = 'admin') INTO is_admin_flag
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que o owner da função seja postgres (necessário em alguns setups Supabase hosted)
ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- 3. Aplicar política na tabela courier_contracts SEM usar a função (teste de isolamento)
-- Se isso funcionar, o problema era a função.
ALTER TABLE public.courier_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access courier_contracts" ON public.courier_contracts;
DROP POLICY IF EXISTS "Admins full access" ON public.courier_contracts; -- criada pelo script 051

CREATE POLICY "Admins full access contracts direct"
ON public.courier_contracts
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Log de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Policies updated directly for courier_contracts to avoid function recursion.';
END $$;

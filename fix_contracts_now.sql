-- Execute este comando no SQL Editor do Supabase IMEDIATAMENTE

-- 1. Habilita RLS (caso não esteja)
ALTER TABLE IF EXISTS public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas antigas que podem estar bloqueando (limpeza)
DROP POLICY IF EXISTS "Admins full access courier_contracts" ON public.courier_contracts;
DROP POLICY IF EXISTS "Admin full access" ON public.courier_contracts;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.courier_contracts;

-- 3. Cria a política CORRETA e PERMISSIVA para Admin
CREATE POLICY "Admins full access courier_contracts"
ON public.courier_contracts
FOR ALL
TO authenticated
USING (
  -- Verifica se é admin consultando a tabela profiles de forma segura
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Opcional: Permitir leitura para quem é dono do contrato (se necessário)
DROP POLICY IF EXISTS "Users can view own contracts" ON public.courier_contracts;
CREATE POLICY "Users can view own contracts"
ON public.courier_contracts
FOR SELECT
TO authenticated
USING (
  courier_id = auth.uid() 
  OR 
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
);

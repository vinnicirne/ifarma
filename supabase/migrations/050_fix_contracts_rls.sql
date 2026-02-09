-- Liberar acesso total para ADMINS na tabela de contratos de motoboys
ALTER TABLE IF EXISTS public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admins can manage courier_contracts" ON public.courier_contracts;
DROP POLICY IF EXISTS "Admins full access courier_contracts" ON public.courier_contracts;

-- Criar política permissiva para Admin usando nossa função segura (is_admin)
CREATE POLICY "Admins full access courier_contracts"
ON public.courier_contracts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Garantir que farmácias possam ver seus próprios contratos (caso necessário)
DROP POLICY IF EXISTS "Pharmacies can view own contracts" ON public.courier_contracts;
CREATE POLICY "Pharmacies can view own contracts"
ON public.courier_contracts
FOR SELECT
TO authenticated
USING (pharmacy_id IN (
    SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
));

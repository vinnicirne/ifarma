-- ADICIONAR POLÍTICA DE INSERT PARA PROFILES
-- Permite que Staff (admin) crie novos perfis

-- Adicionar política de INSERT para Staff
CREATE POLICY "Staff create profiles" 
ON profiles 
FOR INSERT 
WITH CHECK (public.is_staff());

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- =============================================================================
-- MIGRATION: FIX PRIVACY & RLS LEAKS
-- DESCRIPTION: Ensures pharmacy members can ONLY see their own team.
-- =============================================================================

BEGIN;

-- 1. Redefinir a função is_staff para ser mais rigorosa
-- Atualmente ela retorna TRUE para qualquer usuário com role 'merchant', 
-- o que nas políticas globais (Select * from profiles where is_staff()) permitia ver TUDO.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'support', 'operator') -- Merchant removido do staff global
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Corrigir políticas da tabela PROFILES
-- Remover políticas permissivas demais
DROP POLICY IF EXISTS "Staff view any profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;

-- Nova política: Membros de farmácia só veem quem pertence à mesma farmácia
CREATE POLICY "Pharmacy members view own team"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    pharmacy_id = (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
    OR
    public.is_staff() -- Admin global ainda vê tudo
    OR
    auth.uid() = id -- Usuário vê a si mesmo
);

-- 3. Corrigir políticas de UPDATE em PROFILES
DROP POLICY IF EXISTS "Staff update any profile" ON public.profiles;
CREATE POLICY "Pharmacy managers update own team"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    (
        pharmacy_id = (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
        AND 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('merchant', 'manager'))
    )
    OR
    public.is_staff()
);

COMMIT;

-- Logs de Verificação
SELECT '✅ PRIVACIDADE DE EQUIPE RESTAURADA' as status;

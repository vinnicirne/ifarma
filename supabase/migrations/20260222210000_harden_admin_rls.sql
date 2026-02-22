-- =============================================================================
-- MIGRATION: HARDEN ADMIN RLS & REPAIR PROFILE VISIBILITY
-- DESCRIPTION: Ensures admins can always see all profiles regardless of metadata gaps.
-- =============================================================================

BEGIN;

-- 1. Criar uma função is_admin() mais robusta que olha metadados E banco.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar is_staff() para usar is_admin()
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    public.is_admin()
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('support', 'operator')
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('support', 'operator')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir que a política de vizualização para ADMIN seja prioridade máxima
DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
CREATE POLICY "Admin view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- 4. Adicionar política de vizualização de PHARMACIES para o staff (caso não exista)
DROP POLICY IF EXISTS "Staff view all pharmacies" ON public.pharmacies;
CREATE POLICY "Staff view all pharmacies"
ON public.pharmacies FOR SELECT
TO authenticated
USING (public.is_staff());

COMMIT;

SELECT '✅ RLS ADMINISTRATIVO REPARADO: VISIBILIDADE DE PERFIS GARANTIDA' as status;

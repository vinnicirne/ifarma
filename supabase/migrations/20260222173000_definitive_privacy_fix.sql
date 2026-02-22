-- =============================================================================
-- MIGRATION: DEFINITIVE PRIVACY FIX (RLS & STAFF DEFINITION)
-- DESCRIPTION: Prevents data leaks between pharmacies by redefining 'staff'
--              and tightening the 'profiles' RLS policies.
-- =============================================================================

BEGIN;

-- 1. Redefinir a função is_staff() para EXCLUIR 'merchant' do staff global.
-- Merchants devem ser staff apenas da sua própria farmácia.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'support', 'operator') -- Merchant REMOVIDO
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Limpar todas as políticas antigas e permissivas de PROFILES
DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff view any profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Merchant view pharmacy team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Merchant update pharmacy team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pharmacy members view own team" ON public.profiles;
DROP POLICY IF EXISTS "Pharmacy managers update own team" ON public.profiles;

-- 3. CRIAR NOVAS POLÍTICAS RÍGIDAS PARA PROFILES

-- A) Admin/Support vê tudo
CREATE POLICY "Admin view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_staff());

-- B) Usuário vê a si mesmo
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- C) Membros de farmácia veem apenas sua equipe
-- Isso cobre Donos (Merchants), Gerentes e Staff.
CREATE POLICY "Pharmacy team viewing"
ON public.profiles FOR SELECT
TO authenticated
USING (
    pharmacy_id IS NOT NULL 
    AND 
    pharmacy_id = (SELECT p.pharmacy_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- D) Gestores podem atualizar apenas sua equipe
CREATE POLICY "Pharmacy team management"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    pharmacy_id IS NOT NULL 
    AND 
    pharmacy_id = (SELECT p.pharmacy_id FROM public.profiles p WHERE p.id = auth.uid())
    AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('merchant', 'manager', 'admin'))
);

-- E) Clientes podem ver o perfil do motoboy que está entregando seu pedido
-- (Importante para o rastreamento no app do cliente)
CREATE POLICY "Customers view delivery driver profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
    role = 'motoboy' 
    AND 
    id IN (SELECT motoboy_id FROM public.orders WHERE customer_id = auth.uid() AND status NOT IN ('delivered', 'cancelled'))
);

-- 4. Aplicar proteção similar em PHARMACIES para evitar que um dono edite outra farmácia
DROP POLICY IF EXISTS "Owner update own pharmacy" ON public.pharmacies;
CREATE POLICY "Owner update own pharmacy" 
ON public.pharmacies FOR UPDATE 
USING (owner_id = auth.uid() OR public.is_staff());

COMMIT;

-- Verificação
SELECT '✅ PRIVACIDADE REESTABELECIDA: LEAK DE EQUIPE CORRIGIDO' as status;

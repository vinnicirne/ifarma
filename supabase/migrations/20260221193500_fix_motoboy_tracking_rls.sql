-- =============================================================================
-- MIGRATION: FIX MOTOBOY TRACKING RLS & SESSION PROTECTION
-- DESCRIPTION: Ensures motoboys can track their routes and updates RLS.
-- =============================================================================

BEGIN;

-- 0. Adicionar colunas de telemetria se não existirem
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_charging BOOLEAN;

-- 1. Garantir que a tabela route_history existe e tem as colunas corretas
-- (Caso já exista, o IF NOT EXISTS ou ALTER TABLE trata)
CREATE TABLE IF NOT EXISTS public.route_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motoboy_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "motoboy_insert_own_route_history" ON public.route_history;
DROP POLICY IF EXISTS "motoboy_view_own_route_history" ON public.route_history;
DROP POLICY IF EXISTS "motoboy_update_own_route_history" ON public.route_history;
DROP POLICY IF EXISTS "Staff view all route history" ON public.route_history;
DROP POLICY IF EXISTS "service_role_insert_route_history" ON public.route_history;

-- 4. Criar novas políticas de segurança

-- Motoboy pode inserir sua própria localização
CREATE POLICY "motoboy_insert_own_route_history"
ON public.route_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = motoboy_id);

-- Motoboy pode ver seu próprio histórico
CREATE POLICY "motoboy_view_own_route_history"
ON public.route_history
FOR SELECT
TO authenticated
USING (auth.uid() = motoboy_id);

-- Staff (Admin/Operator) pode ver tudo
CREATE POLICY "Staff view all route history"
ON public.route_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'operator', 'merchant')
    )
);

-- Service Role tem acesso total (necessário para a Edge Function bypassar RLS)
CREATE POLICY "service_role_access_all_route_history"
ON public.route_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Melhorar políticas na tabela profiles para localização
-- Permitir que o motoboy atualize sua própria latitude/longitude
DROP POLICY IF EXISTS "Motoboy update own location" ON public.profiles;
CREATE POLICY "Motoboy update own location"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    (role = 'motoboy' OR role = 'staff')
);

COMMIT;

-- Logs de Verificação
SELECT '✅ MOTOBOY TRACKING FIX APLICADO' as status;

-- ============================================
-- FIX RLS: system_settings
-- ============================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Permitir leitura para todos (Necessário para carregar chaves de API públicas no front/app)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users" ON public.system_settings
    FOR SELECT USING (true);

-- 2. Permitir inserção apenas para admins
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.system_settings;
CREATE POLICY "Enable insert for admins only" ON public.system_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Permitir atualização apenas para admins
DROP POLICY IF EXISTS "Enable update for admins only" ON public.system_settings;
CREATE POLICY "Enable update for admins only" ON public.system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Permitir deleção apenas para admins
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.system_settings;
CREATE POLICY "Enable delete for admins only" ON public.system_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

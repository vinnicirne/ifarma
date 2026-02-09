-- ==============================================================================
-- GLOBAL ADMIN PERMISSIONS REPAIR
-- Este script itera sobre TODAS as tabelas do schema 'public' e garante que:
-- 1. RLS esteja habilitado.
-- 2. exista uma política "Admins full access" que permite tudo ao admin.
-- ==============================================================================

DO $$
DECLARE
    -- Variável para iterar sobre as tabelas
    t text;
BEGIN
    -- Loop por todas as tabelas do schema public
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        -- Log para debug no console do banco
        RAISE NOTICE '🔧 Fixing permissions for table: %', t;

        -- 1. Garantir RLS Habilitado (Segurança básica)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

        -- 2. Remover política antiga de Admin (se existir) para evitar conflitos ou definições desatualizadas
        -- Removemos variações comuns de nomes para padronizar
        EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can do everything" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I;', t);

        -- 3. Criar a Política Padronizada "Admins full access"
        -- Usa a função security definer public.is_admin() para evitar loops infinitos
        EXECUTE format('
            CREATE POLICY "Admins full access" ON public.%I
            FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
        ', t);
        
    END LOOP;
END $$;

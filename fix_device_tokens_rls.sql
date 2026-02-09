-- Verifica e corrige RLS para device_tokens
-- Permitir que admins vejam todos os tokens para enviar notificações

DO $$
BEGIN
    -- Habilitar RLS em device_tokens se não estiver
    ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

    -- Política para Admins lerem todos os tokens
    DROP POLICY IF EXISTS "Admins can read all device tokens" ON public.device_tokens;
    CREATE POLICY "Admins can read all device tokens"
    ON public.device_tokens
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

    -- Política para usuários inserirem seus próprios tokens (já deve existir, mas reforçando)
    DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.device_tokens;
    CREATE POLICY "Users can insert their own tokens"
    ON public.device_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    -- Política para usuários verem seus próprios tokens
    DROP POLICY IF EXISTS "Users can see their own tokens" ON public.device_tokens;
    CREATE POLICY "Users can see their own tokens"
    ON public.device_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

END $$;

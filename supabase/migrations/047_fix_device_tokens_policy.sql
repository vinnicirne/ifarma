-- Permitir que Admins leiam tokens de dispositivo para enviar notificações
-- Migration para corrigir permissões RLS

DO $$
BEGIN
    -- Habilitar RLS em device_tokens se não estiver
    ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

    -- Remover política antiga se existir para evitar conflito
    DROP POLICY IF EXISTS "Admins can read all device tokens" ON public.device_tokens;
    
    -- Criar política permitindo SELECT para admins
    CREATE POLICY "Admins can read all device tokens"
    ON public.device_tokens
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

    -- Garantir que usuários possam ver seus próprios tokens (caso não exista)
    DROP POLICY IF EXISTS "Users can see their own tokens" ON public.device_tokens;
    CREATE POLICY "Users can see their own tokens"
    ON public.device_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

END $$;

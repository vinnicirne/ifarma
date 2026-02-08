-- ====================================================================
-- HOTFIX: UNIFICAÇÃO DE TRIGGERS E REPARO DE NOTIFICAÇÕES (V5)
-- Objetivo: Corrigir placeholders e sincronizar colunas de leitura
-- Projeto: isldwcghygyehuvohxaq
-- Data: 2026-02-08
-- ====================================================================

-- 1. SINCRONIZAÇÃO DE SCHEMA (is_read vs read)
DO $$ 
BEGIN
    -- Unificar para 'is_read'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
            ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
        ELSE
            UPDATE public.notifications SET is_read = read WHERE is_read IS FALSE AND read IS TRUE;
            ALTER TABLE public.notifications DROP COLUMN read;
        END IF;
    END IF;

    -- Garantir coluna 'data' para metadados (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. FUNÇÃO MESTRE DE NOTIFICAÇÃO (Substituindo placeholders por chaves reais)
CREATE OR REPLACE FUNCTION public.handle_system_notification_webhook()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
    request_id BIGINT;
BEGIN
    -- Define a URL baseada na tabela
    IF (TG_TABLE_NAME = 'orders') THEN
        -- Se for atribuição de motoboy, usa o motoboy-notifier, senão order-notifier
        IF (NEW.motoboy_id IS NOT NULL AND (OLD.motoboy_id IS NULL OR NEW.motoboy_id <> OLD.motoboy_id)) THEN
            project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/motoboy-notifier';
        ELSE
            project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
        END IF;
    ELSIF (TG_TABLE_NAME = 'order_messages') THEN
        project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
    END IF;

    -- Dispara o Webhook se a URL foi definida
    IF (project_url IS NOT NULL) THEN
        SELECT net.http_post(
            url := project_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || api_key
            ),
            body := jsonb_build_object(
                'type', TG_OP,
                'table', TG_TABLE_NAME,
                'schema', TG_TABLE_SCHEMA,
                'record', row_to_json(NEW),
                'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            )
        ) INTO request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECRIAR TRIGGERS
DROP TRIGGER IF EXISTS on_order_activity ON public.orders;
CREATE TRIGGER on_order_activity
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_system_notification_webhook();

DROP TRIGGER IF EXISTS on_message_activity ON public.order_messages;
CREATE TRIGGER on_message_activity
    AFTER INSERT ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_system_notification_webhook();

-- 4. PERMISSÕES FINAIS E REALTIME
GRANT ALL ON public.notifications TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        END IF;
    END IF;
END $$;

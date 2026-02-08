-- FIX: Atualizar triggers de notificação com URL e Keys corretas
-- Inclui suporte para CHAT (order_messages) e PEDIDOS (orders)

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Função para Notificar Novos Pedidos (Corrigida)
CREATE OR REPLACE FUNCTION public.handle_new_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    -- URL do Projeto (Isolado do setup_motoboy_trigger.sql)
    project_url TEXT := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
    -- Anon Key (Copiada do setup_motoboy_trigger.sql que sabemos que funciona)
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
    request_id BIGINT;
BEGIN
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
            'record', row_to_json(NEW)
        )
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para Notificar Novas Mensagens de Chat (Nova)
CREATE OR REPLACE FUNCTION public.handle_new_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
    request_id BIGINT;
BEGIN
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
            'record', row_to_json(NEW)
        )
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar Trigger de Pedidos (Agora suporta STATUS UPDATE)
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_order_notification();

-- 4. Criar Trigger de Chat
DROP TRIGGER IF EXISTS on_chat_message_created ON public.order_messages;
CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chat_notification();

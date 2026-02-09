-- PASSO 1: Habilitar extensão pg_net (necessária para Webhooks HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- PASSO 2: Criar função que chama a Edge Function
-- Substitua <PROJECT_REF> pelo ID do seu projeto (ex: abcdefgh)
-- Substitua <ANON_KEY> pela sua chave pública (ou service_role se necessário)
CREATE OR REPLACE FUNCTION public.handle_new_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
    request_id BIGINT;
BEGIN
    -- Chama a Edge Function via POST
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

-- PASSO 3: Criar o Trigger
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_order_notification();

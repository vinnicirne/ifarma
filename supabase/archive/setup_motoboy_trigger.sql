-- PASSO 1: Criar função que chama a Edge Function de Motoboy
-- Substitua <PROJECT_REF> e <ANON_KEY>
CREATE OR REPLACE FUNCTION public.handle_motoboy_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/motoboy-notifier';
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
    request_id BIGINT;
    old_motoboy_id UUID;
BEGIN
    old_motoboy_id := NULL;
    IF (TG_OP = 'UPDATE') THEN
        old_motoboy_id := OLD.motoboy_id;
    END IF;

    -- Só dispara se o motoboy mudou ou foi atribuído agora
    IF (NEW.motoboy_id IS NOT NULL AND (old_motoboy_id IS NULL OR NEW.motoboy_id <> old_motoboy_id)) THEN
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

-- PASSO 2: Criar o Trigger para Motoboy
DROP TRIGGER IF EXISTS on_motoboy_assigned ON public.orders;
CREATE TRIGGER on_motoboy_assigned
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_motoboy_assignment_notification();

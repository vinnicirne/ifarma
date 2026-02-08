-- FIX: Sincronizar schema de notificações com o código (v3 - Robusta)
-- Este script resolve o erro de "column is_read already exists"

DO $$
BEGIN
    -- 1. Caso existam as duas colunas (read e is_read)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        
        RAISE NOTICE 'Ambas as colunas existem. Sincronizando dados e removendo a antiga...';
        UPDATE public.notifications SET is_read = read WHERE is_read IS FALSE AND read IS TRUE;
        ALTER TABLE public.notifications DROP COLUMN read;

    -- 2. Caso exista apenas a 'read' -> Renomeia para 'is_read'
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') THEN
        
        RAISE NOTICE 'Renomeando coluna read para is_read...';
        ALTER TABLE public.notifications RENAME COLUMN read TO is_read;

    -- 3. Caso não exista nenhuma das duas -> Cria 'is_read'
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        
        RAISE NOTICE 'Criando coluna is_read...';
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Garantir que a coluna 'data' existe para metadados (orderId, etc)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Habilitar Realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Publicação supabase_realtime não encontrada ou erro ao adicionar tabela.';
    END IF;
END $$;

-- 4. Garantir permissões
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

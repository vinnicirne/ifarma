-- FIX: Sincronizar schema de notificações com o código (is_read e data)
-- Data: 2026-02-07

-- 1. Renomear 'read' para 'is_read' se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'read'
    ) THEN
        ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    END IF;
END $$;

-- 2. Garantir que a coluna 'is_read' existe (caso não tenha 'read' nem 'is_read')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Adicionar coluna 'data' (JSONB) para metadados (como orderId)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'data'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Garantir Realtime na tabela notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Re-habilitar Realtime se necessário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- Dica para o usuário: Rode esse script no SQL Editor do Supabase.

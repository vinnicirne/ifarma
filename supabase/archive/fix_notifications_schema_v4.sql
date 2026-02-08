-- FIX: Sincronizar schema de notificações (v4 - Final e Sem Erros)
-- Este script foi corrigido para evitar erros de sintaxe no EXCEPTION

-- 1. Unificar colunas 'read' e 'is_read'
DO $$ 
BEGIN
    -- Caso 1: Existe 'read' mas não 'is_read', renomeia
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    
    -- Caso 2: Existem as duas, sincroniza e remove a antiga
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        UPDATE public.notifications SET is_read = read WHERE read IS TRUE;
        ALTER TABLE public.notifications DROP COLUMN read;
        
    -- Caso 3: Nenhuma existe, cria a correta
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Garantir coluna 'data' para metadados (orderId, etc)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Habilitar Realtime de forma segura
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    -- Verifica se a publicação existe antes de tentar adicionar
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Adiciona a tabela se ela ainda não estiver na publicação
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        END IF;
    END IF;
END $$;

-- 4. Garantir permissões
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notifications TO anon;

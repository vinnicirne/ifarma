-- ===============================================================
-- FIX REALTIME REPLICATION (CORREÇÃO DE CONEXÃO)
-- Execute este script no Editor SQL do Supabase
-- ===============================================================

-- 1. Forçar Replica Identity para FULL na tabela orders
-- Isso garante que o Supabase envie os dados completos (novo e antigo) no Realtime
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 2. Garantir que a tabela orders está na publicação do Realtime
-- Adiciona a tabela se ela ainda não estiver lá
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
        RAISE NOTICE 'Tabela orders adicionada ao Realtime.';
    ELSE
        RAISE NOTICE 'Tabela orders já estava no Realtime.';
    END IF;
END
$$;

-- 3. Verificação de Integridade
-- Confirma se a configuração foi aplicada
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'orders';
-- (d = default, n = nothing, f = full, i = index) -> DEVE SER 'f'

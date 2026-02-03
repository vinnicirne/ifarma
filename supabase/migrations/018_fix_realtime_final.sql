-- CORREÇÃO DEFINITIVA DO REALTIME (Executar no SQL Editor do Supabase)
-- Este script habilita o envio de todos os dados no UPDATE e garante permissões.

BEGIN;

-- 1. Habilitar REPLICA IDENTITY FULL (Obrigatório para filtros em UPDATE)
-- Sem isso, o evento UPDATE só manda as colunas que mudaram, e o filtro "pharmacy_id=eq..." falha se o ID não mudar.
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 2. Garantir que a tabela está na publicação do Realtime
-- Usamos um bloco DO para evitar erro se já estiver lá.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION
    WHEN sqlstate '42710' THEN
        RAISE NOTICE 'Tabela orders já estava no Realtime.';
END $$;

-- 3. Habilitar Row Level Security (RLS) se não estiver
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Criar Política de Leitura Permissiva para o Realtime
-- O Realtime precisa conseguir ler as linhas para enviar.
-- Vamos garantir que usuários autenticados e anon (se necessário) possam ver.
DROP POLICY IF EXISTS "Enable read for authenticated users" ON orders;
CREATE POLICY "Enable read for authenticated users" ON orders
    FOR SELECT
    TO authenticated
    USING (true); -- Permite ler tudo (filtragem será feita no front ou por outras regras se preferir)

-- Se o seu app usa chave anon para conectar, também precisa disso:
DROP POLICY IF EXISTS "Enable read for anon users" ON orders;
CREATE POLICY "Enable read for anon users" ON orders
    FOR SELECT
    TO anon
    USING (true);

-- 5. Permissões de Grant
GRANT SELECT ON orders TO anon;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO service_role;

COMMIT;

-- FIM

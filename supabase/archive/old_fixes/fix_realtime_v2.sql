-- CORREÇÃO: SCRIPT ROBUSTO PARA REALTIME
-- Este script trata o erro "already member" e garante que tudo fique configurado.

BEGIN;

-- 1. Garante permissões (Isso é crucial e não gera erro se repetir)
GRANT SELECT ON orders TO anon;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO service_role;

-- 2. Garante que o Supabase envie os dados antigos no UPDATE (Full)
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 3. Adiciona ao Realtime de forma segura (Ignora se já estiver)
DO $$
BEGIN
    -- Tenta adicionar
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION
    -- Se der erro 42710 (já existe), apenas avisa e segue
    WHEN sqlstate '42710' THEN
        RAISE NOTICE 'A tabela orders JÁ estava no Realtime. Tudo certo!';
END $$;

COMMIT;

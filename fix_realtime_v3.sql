-- =============================================
-- CORREÇÃO REALTIME V3 - IFARMA
-- =============================================

BEGIN;

-- 1. Habilitar Replica Identity Full para suportar filtros em Update/Delete
-- Isso garante que todos os campos (incluindo pharmacy_id) sejam enviados no broadcast.
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 2. Garantir que a tabela está na publicação do Realtime
-- Se a tabela não estiver aqui, o Realtime falha ao tentar assinar mudanças nela.
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE orders;

-- NOTA: Se você já tem outras tabelas no Realtime, use o comando abaixo em vez de recriar:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 3. Habilitar RLS e permissões
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Realtime read access" ON orders;
CREATE POLICY "Realtime read access" ON orders
    FOR SELECT
    TO authenticated
    USING (true); -- Em produção, você pode restringir mais, mas para debug usamos true.

-- 4. Grants necessários
GRANT SELECT ON orders TO authenticated;

COMMIT;

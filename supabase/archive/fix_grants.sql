-- ===============================================================
-- CORREÇÃO DE PERMISSÕES DE NÍVEL DE BANCO (GRANTS)
-- ===============================================================
-- Às vezes, o RLS está certo, mas o usuário "authenticated" não tem permissão básica
-- de leitura na tabela. Este script resolve isso.

-- 1. Garantir uso do Schema Public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Garantir acesso total a todas as tabelas para usuários logados
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Garantir acesso a sequências (para auto-incremento/ids)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Reforçar Política do Catálogo (Adicionando 'anon' para teste se necessário, mas focando em auth)
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read All" ON product_catalog;
CREATE POLICY "Public Read All" ON product_catalog FOR SELECT TO authenticated USING (true);

-- (Permissões aplicadas. Verifique se o erro 403 sumiu.)
-- (Se der erro de RAISE, ignore, o importante é o comando acima rodar)

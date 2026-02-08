-- ===============================================================
-- CORREÇÃO TOTAL DE PERMISSÕES (RLS) - "CHAVE MESTRA"
-- ===============================================================
-- Execute este script para liberar o acesso às tabelas que estão dando erro 403.

-- 1. Liberar Catálogo ANVISA (Para a busca funcionar)
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Catalog" ON product_catalog;
CREATE POLICY "Public Read Catalog" ON product_catalog FOR SELECT TO authenticated USING (true);

-- 2. Liberar Tabela de Produtos (Seu Inventário)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Read Products" ON products;
CREATE POLICY "Auth Read Products" ON products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth Insert Products" ON products;
CREATE POLICY "Auth Insert Products" ON products FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Update Products" ON products;
CREATE POLICY "Auth Update Products" ON products FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth Delete Products" ON products;
CREATE POLICY "Auth Delete Products" ON products FOR DELETE TO authenticated USING (true);

-- 3. Liberar Leitura de Farmácias e Perfis (Para carregar dados do usuário)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Read Pharmacies" ON pharmacies;
CREATE POLICY "Auth Read Pharmacies" ON pharmacies FOR SELECT TO authenticated USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Read Profiles" ON profiles;
CREATE POLICY "Auth Read Profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- (Fim do Script)

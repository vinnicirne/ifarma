-- ===============================================================
-- LIBERAÇÃO DE ACESSO PÚBLICO (CLIENTES / VISITANTES)
-- ===============================================================

-- 1. Garante que qualquer um (logado ou não) possa 'ler' as tabelas básicas
GRANT SELECT ON TABLE products TO anon;
GRANT SELECT ON TABLE pharmacies TO anon;
GRANT SELECT ON TABLE product_catalog TO anon;

-- 2. Reforça para usuários logados também
GRANT SELECT ON TABLE products TO authenticated;
GRANT SELECT ON TABLE pharmacies TO authenticated;
GRANT SELECT ON TABLE product_catalog TO authenticated;

-- (Agora os produtos devem aparecer na loja para todo mundo)

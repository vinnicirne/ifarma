-- ============================================
-- SCRIPT DE VERIFICAÇÃO - CATÁLOGO AVANÇADO
-- Execute este script para verificar se tudo foi instalado corretamente
-- ============================================

-- 1. Verificar se as extensões estão instaladas
SELECT 
    extname as "Extensão",
    extversion as "Versão"
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'postgis', 'unaccent')
ORDER BY extname;

-- 2. Verificar tabelas criadas
SELECT 
    table_name as "Tabela",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "Colunas"
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'categories',
    'collections',
    'product_collections',
    'product_catalog',
    'badges',
    'product_badges',
    'products'
)
ORDER BY table_name;

-- 3. Verificar contagem de dados
SELECT 'Categories' as "Tabela", COUNT(*) as "Registros" FROM public.categories
UNION ALL
SELECT 'Collections', COUNT(*) FROM public.collections
UNION ALL
SELECT 'Product Catalog', COUNT(*) FROM public.product_catalog
UNION ALL
SELECT 'Products', COUNT(*) FROM public.products
UNION ALL
SELECT 'Badges', COUNT(*) FROM public.badges;

-- 4. Verificar estrutura de categories (deve ter parent_id e description)
SELECT 
    column_name as "Coluna",
    data_type as "Tipo",
    is_nullable as "Nulo?"
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('parent_id', 'description', 'slug', 'name')
ORDER BY column_name;

-- 5. Verificar estrutura de products (novos campos)
SELECT 
    column_name as "Coluna",
    data_type as "Tipo"
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN (
    'brand',
    'dosage',
    'quantity_label',
    'principle_active',
    'tags',
    'synonyms',
    'control_level',
    'usage_instructions'
)
ORDER BY column_name;

-- 6. Verificar RLS (Row Level Security)
SELECT 
    tablename as "Tabela",
    policyname as "Política",
    cmd as "Comando",
    qual as "Condição"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('categories', 'collections', 'product_catalog', 'badges')
ORDER BY tablename, policyname;

-- 7. Verificar índices de busca
SELECT 
    tablename as "Tabela",
    indexname as "Índice",
    indexdef as "Definição"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('product_catalog', 'categories', 'products')
AND indexname LIKE '%trgm%' OR indexname LIKE '%brand%' OR indexname LIKE '%ean%'
ORDER BY tablename, indexname;

-- 8. Testar busca no catálogo ANVISA (deve retornar resultados)
SELECT 
    name as "Produto",
    brand as "Marca",
    category as "Categoria",
    requires_prescription as "Receita?"
FROM public.product_catalog
WHERE name ILIKE '%dipirona%'
LIMIT 5;

-- 9. Verificar coleções padrão (devem existir 4)
SELECT 
    name as "Coleção",
    type as "Tipo",
    slug as "Slug"
FROM public.collections
ORDER BY name;

-- 10. Verificar categorias padrão (devem existir 5)
SELECT 
    name as "Categoria",
    slug as "Slug",
    position as "Posição"
FROM public.categories
ORDER BY position;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- 1. Extensões: 4 extensões instaladas
-- 2. Tabelas: 7 tabelas listadas
-- 3. Dados:
--    - Categories: 5 registros
--    - Collections: 4 registros
--    - Product Catalog: ~10.027 registros
--    - Products: (varia por farmácia)
--    - Badges: 0 (ainda não populado)
-- 4. Categories: 4 colunas (parent_id, description, slug, name)
-- 5. Products: 8 novos campos
-- 6. RLS: Múltiplas políticas por tabela
-- 7. Índices: Pelo menos 3 índices de busca
-- 8. Busca: 5 produtos com "dipirona"
-- 9. Coleções: 4 coleções (Gripe, Dor, Infantil, Imunidade)
-- 10. Categorias: 5 categorias (Medicamentos, Higiene, Beleza, Infantil, Suplementos)
-- ============================================

-- Se algum resultado não corresponder ao esperado, revise a execução das migrações!

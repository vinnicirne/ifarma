-- ============================================
-- ADICIONAR SEÇÃO DE DESTAQUES (PHARMACY_LIST.FEATURED)
-- ============================================

-- Primeiro, verificar se já existe (para evitar duplicatas)
-- SELECT * FROM app_feed_sections WHERE type = 'pharmacy_list.featured';

-- Adicionar a seção de farmácias em destaque
INSERT INTO app_feed_sections (title, type, position, is_active, config)
VALUES (
    'Farmácias em Destaque', 
    'pharmacy_list.featured', 
    2, -- Entre o carousel e as promoções
    true, 
    '{"limit": 10}'
);

-- Garantir que as outras posições façam sentido
UPDATE app_feed_sections SET position = 1 WHERE type = 'banner.top';
UPDATE app_feed_sections SET position = 2 WHERE type = 'pharmacy_list.featured';
UPDATE app_feed_sections SET position = 3 WHERE type = 'pharmacy_list.bonus';
UPDATE app_feed_sections SET position = 4 WHERE type = 'ads.internal';
UPDATE app_feed_sections SET position = 5 WHERE type = 'pharmacy_list.nearby';
UPDATE app_feed_sections SET position = 6 WHERE type = 'admob.banner';

-- Verificar resultado
SELECT id, title, type, position, is_active FROM app_feed_sections ORDER BY position;

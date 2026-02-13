-- Corrigir as positions e titles das seções
UPDATE app_feed_sections SET title = 'Anúncios Internos', position = 3 WHERE type = 'ads.internal';
UPDATE app_feed_sections SET position = 4 WHERE type = 'category_grid';
UPDATE app_feed_sections SET position = 5 WHERE type = 'pharmacy_list.bonus';
UPDATE app_feed_sections SET position = 6 WHERE type = 'pharmacy_list.nearby';
UPDATE app_feed_sections SET position = 7 WHERE type = 'admob.banner';

-- Verificar resultado
SELECT type, title, position, is_active 
FROM app_feed_sections 
ORDER BY position;

-- Primeiro, verificar dados existentes
SELECT * FROM app_feed_sections ORDER BY position;

-- Limpar dados antigos (se necessário)
-- DELETE FROM app_feed_sections;

-- Inserir configuração padrão SEM ON CONFLICT
-- Se já existirem dados, você pode deletar primeiro ou usar UPDATE manualmente
INSERT INTO app_feed_sections (type, title, is_active, position, config) VALUES
  ('banner.top', 'Ofertas da Semana', true, 1, '{"autoplay": true, "interval": 5000}'),
  ('pharmacy_list.featured', 'Patrocinado', true, 2, '{"limit": 10, "show_distance": true}'),
  ('ads.internal', 'Anúncios Internos', true, 3, '{"region": "global"}'),
  ('category_grid', 'Categorias', true, 4, '{"columns": 4}'),
  ('pharmacy_list.bonus', 'Ofertas Especiais', true, 5, '{"limit": 5}'),
  ('pharmacy_list.nearby', 'Perto de Você', true, 6, '{"limit": 20, "show_distance": true}');

-- OU, se já existirem dados e você quer apenas ativar:
-- UPDATE app_feed_sections SET is_active = true WHERE type IN (
--   'banner.top', 
--   'pharmacy_list.featured', 
--   'pharmacy_list.nearby'
-- );

-- Verificar se há farmácias aprovadas
SELECT 
  id, 
  name, 
  status, 
  plan,
  is_featured,
  is_sponsored,
  latitude,
  longitude
FROM pharmacies 
WHERE status = 'Aprovado'
ORDER BY is_featured DESC, is_sponsored DESC
LIMIT 10;

-- Contar total de farmácias aprovadas
SELECT COUNT(*) as total_aprovadas FROM pharmacies WHERE status = 'Aprovado';

-- Contar farmácias featured/sponsored
SELECT 
  COUNT(*) FILTER (WHERE is_featured = true) as total_featured,
  COUNT(*) FILTER (WHERE is_sponsored = true) as total_sponsored
FROM pharmacies 
WHERE status = 'Aprovado';

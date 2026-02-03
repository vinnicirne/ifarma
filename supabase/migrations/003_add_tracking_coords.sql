-- Adiciona suporte a geolocalização na tabela de pedidos
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Atualiza pedidos existentes (se houver) para usar coordenadas da farmácia (fallback) ou nulo
-- Isso evita erro de undefined no frontend
UPDATE orders 
SET 
  latitude = -22.9068, 
  longitude = -43.1729
WHERE latitude IS NULL;

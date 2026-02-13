-- Limpar duplicatas mantendo apenas a entrada com menor position para cada type
WITH ranked AS (
  SELECT 
    id,
    type,
    ROW_NUMBER() OVER (PARTITION BY type ORDER BY position ASC, created_at ASC) as rn
  FROM app_feed_sections
)
DELETE FROM app_feed_sections
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Verificar resultado
SELECT type, title, position, is_active 
FROM app_feed_sections 
ORDER BY position;

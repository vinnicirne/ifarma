-- DIAGNOSTICO E CORRECAO DE MERCHANTS SEM PHARMACY_ID
-- Execute este script completo no Supabase SQL Editor

-- PASSO 1: Ver merchants sem pharmacy_id
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    p.created_at
FROM profiles p
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL
ORDER BY p.created_at DESC;

-- PASSO 2: Corrigir automaticamente
UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- PASSO 3: Verificar resultado
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.role = 'merchant'
ORDER BY p.created_at DESC
LIMIT 10;

-- PASSO 4: Estatisticas finais
SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';

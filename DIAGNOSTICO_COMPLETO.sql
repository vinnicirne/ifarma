-- 🔍 DIAGNÓSTICO COMPLETO DO PROBLEMA

-- 1. VERIFICAR MERCHANTS SEM PHARMACY_ID
SELECT 
    '=== MERCHANTS SEM PHARMACY_ID ===' as diagnostico;

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

-- 2. VERIFICAR FARMÁCIAS SEM OWNER
SELECT 
    '=== FARMÁCIAS SEM OWNER ===' as diagnostico;

SELECT 
    ph.id,
    ph.name,
    ph.owner_email,
    ph.owner_name,
    ph.status,
    ph.created_at
FROM pharmacies ph
WHERE ph.owner_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.email = ph.owner_email 
    AND p.role = 'merchant'
  )
ORDER BY ph.created_at DESC;

-- 3. CORRIGIR VINCULAÇÃO (MATCH POR EMAIL)
SELECT 
    '=== EXECUTANDO CORREÇÃO ===' as diagnostico;

UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- 4. VERIFICAR RESULTADO DA CORREÇÃO
SELECT 
    '=== RESULTADO PÓS-CORREÇÃO ===' as diagnostico;

SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status as pharmacy_status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.role = 'merchant'
ORDER BY p.created_at DESC
LIMIT 20;

-- 5. ESTATÍSTICAS FINAIS
SELECT 
    '=== ESTATÍSTICAS ===' as diagnostico;

SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';

-- 6. CASO ESPECÍFICO: comercialfaum@gmail.com
SELECT 
    '=== CASO ESPECÍFICO: comercialfaum@gmail.com ===' as diagnostico;

SELECT 
    p.id as profile_id,
    p.email,
    p.pharmacy_id,
    ph.id as farmacia_id,
    ph.name as farmacia_nome
FROM profiles p
LEFT JOIN pharmacies ph ON ph.owner_email = p.email
WHERE p.email = 'comercialfaum@gmail.com';

-- 7. SE AINDA ESTIVER SEM PHARMACY_ID, CORRIGIR MANUALMENTE
-- Descomente e execute se necessário:
/*
UPDATE profiles 
SET pharmacy_id = (
    SELECT id 
    FROM pharmacies 
    WHERE owner_email = 'comercialfaum@gmail.com' 
    LIMIT 1
)
WHERE email = 'comercialfaum@gmail.com'
  AND pharmacy_id IS NULL;
*/
